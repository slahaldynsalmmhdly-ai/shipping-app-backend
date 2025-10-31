const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const EmptyTruckAd = require("../models/EmptyTruckAd");
const User = require("../models/User");
const { applyFeedAlgorithm } = require('../utils/feedAlgorithm');
const { createFollowingPostNotifications, createLikeNotification, createCommentNotification, generateNotificationMessage } = require('../utils/notificationHelper');

// @desc    Create a new empty truck ad
// @route   POST /api/v1/emptytruckads
// @access  Private
router.post("/", protect, async (req, res) => {
  try {
    const { currentLocation, preferredDestination, availabilityDate, truckType, additionalNotes, media, scheduledTime } = req.body;

    if (!currentLocation || !preferredDestination || !availabilityDate || !truckType) {
      return res.status(400).json({ message: "Please fill all required fields" });
    }

    const emptyTruckAd = await EmptyTruckAd.create({
      user: req.user.id,
      currentLocation,
      preferredDestination,
      availabilityDate,
      truckType,
      additionalNotes,
      media,
      scheduledTime: scheduledTime || null,
      isPublished: scheduledTime ? false : true, // If scheduled, not published yet
    });
    
    // إرسال إشعارات للمتابعين عند نشر إعلان شاحنة فارغة جديد
    if (!scheduledTime) { // فقط إذا كان الإعلان منشور فوراً وليس مجدول
      try {
        // استخدام نظام الإشعارات الجديد مع نسبة 15% للخلاصة
        await createFollowingPostNotifications(req.user.id, emptyTruckAd._id, 'emptyTruckAd', 0.15);
      } catch (notifError) {
        console.error('خطأ في إرسال الإشعارات:', notifError);
        // لا نوقف العملية إذا فشل إرسال الإشعارات
      }
    }

    res.status(201).json(emptyTruckAd);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Get all empty truck ads by a specific user
// @route   GET /api/v1/emptytruckads/user/:userId
// @access  Private
router.get("/user/:userId", protect, async (req, res) => {
  try {
    const emptyTruckAds = await EmptyTruckAd.find({ 
      user: req.params.userId, 
      $or: [{ isPublished: true }, { isPublished: { $exists: false } }] 
    })
      .sort({ createdAt: -1 })
      .populate("user", "name avatar");
    res.status(200).json(emptyTruckAds);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Get all empty truck ads (with Facebook-style algorithm)
// @route   GET /api/v1/emptytruckads
// @access  Private
router.get("/", protect, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.id).select('following');
    const following = currentUser?.following || [];

    const emptyTruckAds = await EmptyTruckAd.find({ 
      $or: [{ isPublished: true }, { isPublished: { $exists: false } }],
      hiddenFromHomeFeedFor: { $ne: req.user.id }
    })
      .populate("user", "name avatar userType companyName")
      .lean();

    // Apply Facebook-style algorithm with 5% following ratio
    const finalAds = applyFeedAlgorithm(emptyTruckAds, following, req.user.id, 0.05);

    res.status(200).json(finalAds);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Add/Remove a reaction to an empty truck ad
// @route   PUT /api/v1/emptytruckads/:id/react
// @access  Private
router.put("/:id/react", protect, async (req, res) => {
  try {
    const emptyTruckAd = await EmptyTruckAd.findById(req.params.id);
    if (!emptyTruckAd) {
      return res.status(404).json({ msg: "Empty truck ad not found" });
    }

    const { reactionType } = req.body;
    if (!reactionType || !["like"].includes(reactionType)) {
      return res.status(400).json({ msg: "Invalid reaction type" });
    }

    // Check if the user has already reacted
    const existingReactionIndex = emptyTruckAd.reactions.findIndex(
      (reaction) => reaction.user.toString() === req.user.id
    );

    if (existingReactionIndex > -1) {
      // User has already reacted, check if it's the same reaction type
      if (emptyTruckAd.reactions[existingReactionIndex].type === reactionType) {
        // Same reaction type, remove it (toggle off)
        emptyTruckAd.reactions.splice(existingReactionIndex, 1);
      } else {
        // Different reaction type, update it
        emptyTruckAd.reactions[existingReactionIndex].type = reactionType;
      }
    } else {
      // User has not reacted, add new reaction
      emptyTruckAd.reactions.unshift({ user: req.user.id, type: reactionType });
      
      // Create notification for the ad owner if not self-liking
      if (emptyTruckAd.user.toString() !== req.user.id) {
        const sender = await User.findById(req.user.id).select('name');
        const adOwner = await User.findById(emptyTruckAd.user);
        if (adOwner && sender) {
          adOwner.notifications.unshift({
            type: 'like',
            sender: req.user.id,
            emptyTruckAd: emptyTruckAd._id,
            itemType: 'emptyTruckAd',
            message: generateNotificationMessage('like', sender.name)
          });
          await adOwner.save();
        }
      }
    }

    emptyTruckAd.markModified("reactions");
    await emptyTruckAd.save();

    const updatedEmptyTruckAd = await EmptyTruckAd.findById(req.params.id)
      .populate("user", ["name", "avatar"])
      .populate("reactions.user", ["name", "avatar"]);

    res.json(updatedEmptyTruckAd);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// // @desc    Repost an empty truck ad (create a copy with new date)
// @route   POST /api/v1/emptytruckads/:id/repost
// @access  Private
router.post("/:id/repost", protect, async (req, res) => {
  try {
    const originalAd = await EmptyTruckAd.findById(req.params.id);

    if (!originalAd) {
      return res.status(404).json({ message: "Empty truck ad not found" });
    }

    // Check user authorization
    if (originalAd.user.toString() !== req.user.id) {
      return res.status(401).json({ message: "User not authorized" });
    }

    // Create a new ad with the same data but new createdAt
    const repostedAd = await EmptyTruckAd.create({
      user: originalAd.user,
      currentLocation: originalAd.currentLocation,
      preferredDestination: originalAd.preferredDestination,
      availabilityDate: originalAd.availabilityDate,
      truckType: originalAd.truckType,
      additionalNotes: originalAd.additionalNotes,
      media: originalAd.media,
      reactions: [], // Reset reactions for new post
    });

    const populatedAd = await EmptyTruckAd.findById(repostedAd._id).populate("user", "name avatar");
    res.status(201).json(populatedAd);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Delete empty truck ad
// @route   DELETE /api/v1/emptytruckads/:id
// @access  Private
router.delete("/:id", protect, async (req, res) => {
  try {
    const emptyTruckAd = await EmptyTruckAd.findById(req.params.id);

    if (!emptyTruckAd) {
      return res.status(404).json({ message: "Empty truck ad not found" });
    }

    // Make sure the logged in user matches the ad user
    if (emptyTruckAd.user.toString() !== req.user.id) {
      return res.status(401).json({ message: "User not authorized" });
    }

    await emptyTruckAd.deleteOne();

    res.status(200).json({ message: "Empty truck ad removed" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Add a comment to an empty truck ad
// @route   POST /api/v1/emptytruckads/:id/comment
// @access  Private
router.post("/:id/comment", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    const emptyTruckAd = await EmptyTruckAd.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (!emptyTruckAd) {
      return res.status(404).json({ message: "Empty truck ad not found" });
    }

    const newComment = {
      user: req.user.id,
      text: req.body.text,
    };

    emptyTruckAd.comments.unshift(newComment);
    emptyTruckAd.markModified("comments");
    await emptyTruckAd.save();
    
    // Create notification for the ad owner if not self-commenting
    if (emptyTruckAd.user.toString() !== req.user.id) {
      const sender = await User.findById(req.user.id).select('name');
      const adOwner = await User.findById(emptyTruckAd.user);
      if (adOwner && sender) {
        adOwner.notifications.unshift({
          type: 'comment',
          sender: req.user.id,
          emptyTruckAd: emptyTruckAd._id,
          itemType: 'emptyTruckAd',
          commentId: emptyTruckAd.comments[0]._id,
          message: generateNotificationMessage('comment', sender.name)
        });
        await adOwner.save();
      }
    }
    
    const updatedEmptyTruckAd = await EmptyTruckAd.findById(req.params.id)
      .populate("user", "name avatar")
      .populate({
        path: "comments.user",
        select: "name avatar"
      })
      .populate({
        path: "comments.replies.user",
        select: "name avatar"
      });
    res.json(updatedEmptyTruckAd);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
});

// @desc    Delete a comment from an empty truck ad
// @route   DELETE /api/v1/emptytruckads/:id/comment/:comment_id
// @access  Private
router.delete("/:id/comment/:comment_id", protect, async (req, res) => {
  try {
    const emptyTruckAd = await EmptyTruckAd.findById(req.params.id);

    if (!emptyTruckAd) {
      return res.status(404).json({ message: "Empty truck ad not found" });
    }

    const comment = emptyTruckAd.comments.find(
      (comment) => comment.id === req.params.comment_id
    );

    if (!comment) {
      return res.status(404).json({ message: "Comment does not exist" });
    }

    if (comment.user.toString() !== req.user.id) {
      return res.status(401).json({ message: "User not authorized" });
    }

    const removeIndex = emptyTruckAd.comments
      .map((comment) => comment._id.toString())
      .indexOf(req.params.comment_id);

    emptyTruckAd.comments.splice(removeIndex, 1);

    emptyTruckAd.markModified("comments");
    await emptyTruckAd.save();
    const updatedEmptyTruckAd = await EmptyTruckAd.findById(req.params.id)
      .populate("user", "name avatar")
      .populate({
        path: "comments.user",
        select: "name avatar"
      })
      .populate({
        path: "comments.replies.user",
        select: "name avatar"
      });
    res.json(updatedEmptyTruckAd);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Server Error" });
  }
});

// @desc    Like a comment on an empty truck ad
// @route   PUT /api/v1/emptytruckads/:id/comment/:comment_id/like
// @access  Private
router.put("/:id/comment/:comment_id/like", protect, async (req, res) => {
  try {
    const emptyTruckAd = await EmptyTruckAd.findById(req.params.id);
    if (!emptyTruckAd) {
      return res.status(404).json({ message: "Empty truck ad not found" });
    }

    const comment = emptyTruckAd.comments.id(req.params.comment_id);
    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    const alreadyLiked = comment.likes.some(like => like.user.toString() === req.user.id);
    const alreadyDisliked = comment.dislikes.some(dislike => dislike.user.toString() === req.user.id);

    // If user has disliked, remove dislike
    if (alreadyDisliked) {
      comment.dislikes = comment.dislikes.filter(dislike => dislike.user.toString() !== req.user.id);
    }

    // If user has not liked, add like
    if (!alreadyLiked) {
      comment.likes.unshift({ user: req.user.id });
    }
    // If already liked, do nothing (no toggle)

    emptyTruckAd.markModified("comments");
    await emptyTruckAd.save();
    const updatedEmptyTruckAd = await EmptyTruckAd.findById(req.params.id)
      .populate("user", "name avatar")
      .populate({
        path: "comments.user",
        select: "name avatar"
      })
      .populate({
        path: "comments.replies.user",
        select: "name avatar"
      });
    res.json(updatedEmptyTruckAd);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Server Error" });
  }
});

// @desc    Reply to a comment on an empty truck ad
// @route   POST /api/v1/emptytruckads/:id/comment/:comment_id/reply
// @access  Private
router.post("/:id/comment/:comment_id/reply", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    const emptyTruckAd = await EmptyTruckAd.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (!emptyTruckAd) {
      return res.status(404).json({ message: "Empty truck ad not found" });
    }

    const comment = emptyTruckAd.comments.id(req.params.comment_id);
    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    const newReply = {
      user: req.user.id,
      text: req.body.text,
    };

    comment.replies.unshift(newReply);
    emptyTruckAd.markModified("comments");
    await emptyTruckAd.save();
    const updatedEmptyTruckAd = await EmptyTruckAd.findById(req.params.id)
      .populate("user", "name avatar")
      .populate({
        path: "comments.user",
        select: "name avatar"
      })
      .populate({
        path: "comments.replies.user",
        select: "name avatar"
      });
    res.json(updatedEmptyTruckAd);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
});

// @desc    Like a reply on an empty truck ad
// @route   PUT /api/v1/emptytruckads/:id/comment/:comment_id/reply/:reply_id/like
// @access  Private
router.put("/:id/comment/:comment_id/reply/:reply_id/like", protect, async (req, res) => {
  try {
    const emptyTruckAd = await EmptyTruckAd.findById(req.params.id);
    if (!emptyTruckAd) {
      return res.status(404).json({ message: "Empty truck ad not found" });
    }

    const comment = emptyTruckAd.comments.id(req.params.comment_id);
    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    const reply = comment.replies.id(req.params.reply_id);
    if (!reply) {
      return res.status(404).json({ message: "Reply not found" });
    }

    const alreadyLiked = reply.likes.some(like => like.user.toString() === req.user.id);
    const alreadyDisliked = reply.dislikes.some(dislike => dislike.user.toString() === req.user.id);

    // If user has disliked, remove dislike
    if (alreadyDisliked) {
      reply.dislikes = reply.dislikes.filter(dislike => dislike.user.toString() !== req.user.id);
    }

    // If user has not liked, add like
    if (!alreadyLiked) {
      reply.likes.unshift({ user: req.user.id });
    }
    // If already liked, do nothing (no toggle)

    emptyTruckAd.markModified("comments");
    await emptyTruckAd.save();
    const updatedEmptyTruckAd = await EmptyTruckAd.findById(req.params.id)
      .populate("user", "name avatar")
      .populate({
        path: "comments.user",
        select: "name avatar"
      })
      .populate({
        path: "comments.replies.user",
        select: "name avatar"
      });
    res.json(updatedEmptyTruckAd);
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server Error");
  }
});

// @desc    Delete a reply from a comment on an empty truck ad
// @route   DELETE /api/v1/emptytruckads/:id/comment/:comment_id/reply/:reply_id
// @access  Private
router.delete("/:id/comment/:comment_id/reply/:reply_id", protect, async (req, res) => {
  try {
    const emptyTruckAd = await EmptyTruckAd.findById(req.params.id);
    if (!emptyTruckAd) {
      return res.status(404).json({ message: "Empty truck ad not found" });
    }

    const comment = emptyTruckAd.comments.id(req.params.comment_id);
    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    const reply = comment.replies.id(req.params.reply_id);
    if (!reply) {
      return res.status(404).json({ message: "Reply not found" });
    }

    if (reply.user.toString() !== req.user.id) {
      return res.status(401).json({ message: "User not authorized" });
    }

    comment.replies = comment.replies.filter(
      (r) => r._id.toString() !== req.params.reply_id
    );

    emptyTruckAd.markModified("comments");
    await emptyTruckAd.save();
    const updatedEmptyTruckAd = await EmptyTruckAd.findById(req.params.id)
      .populate("user", "name avatar")
      .populate({
        path: "comments.user",
        select: "name avatar"
      })
      .populate({
        path: "comments.replies.user",
        select: "name avatar"
      });
    res.json(updatedEmptyTruckAd);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
});

// @desc    Get single empty truck ad
// @route   GET /api/v1/emptytruckads/:id
// @access  Private
router.get("/:id", protect, async (req, res) => {
  try {
    const emptyTruckAd = await EmptyTruckAd.findById(req.params.id)
      .populate("user", "name avatar")
      .populate({
        path: "comments.user",
        select: "name avatar"
      })
      .populate({
        path: "comments.replies.user",
        select: "name avatar"
      });

    if (!emptyTruckAd) {
      return res.status(404).json({ message: "Empty truck ad not found" });
    }

    res.status(200).json(emptyTruckAd);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Update an empty truck ad
// @route   PUT /api/v1/emptytruckads/:id
// @access  Private
router.put("/:id", protect, async (req, res) => {
  try {
    const emptyTruckAd = await EmptyTruckAd.findById(req.params.id);

    if (!emptyTruckAd) {
      return res.status(404).json({ message: "Empty truck ad not found" });
    }

    // Check user authorization
    if (emptyTruckAd.user.toString() !== req.user.id) {
      return res.status(401).json({ message: "User not authorized" });
    }

    const {
      currentLocation,
      preferredDestination,
      availabilityDate,
      truckType,
      additionalNotes,
      media,
    } = req.body;

    // Update fields
    if (currentLocation !== undefined) {
      emptyTruckAd.currentLocation = currentLocation;
    }
    if (preferredDestination !== undefined) {
      emptyTruckAd.preferredDestination = preferredDestination;
    }
    if (availabilityDate !== undefined) {
      emptyTruckAd.availabilityDate = availabilityDate;
    }
    if (truckType !== undefined) {
      emptyTruckAd.truckType = truckType;
    }
    if (additionalNotes !== undefined) {
      emptyTruckAd.additionalNotes = additionalNotes;
    }
    if (media !== undefined) {
      emptyTruckAd.media = media;
    }

    await emptyTruckAd.save();

    // Return updated empty truck ad with populated fields
    const updatedEmptyTruckAd = await EmptyTruckAd.findById(req.params.id)
      .populate("user", "name avatar")
      .populate({
        path: "comments.user",
        select: "name avatar"
      })
      .populate({
        path: "comments.replies.user",
        select: "name avatar"
      });

    res.status(200).json(updatedEmptyTruckAd);
  } catch (error) {
    console.error(error.message);
    if (error.kind === "ObjectId") {
      return res.status(404).json({ message: "Empty truck ad not found" });
    }
    res.status(500).json({ message: error.message });
  }
});

// @desc    Dislike a comment on an empty truck ad
// @route   PUT /api/v1/emptytruckads/:id/comment/:comment_id/dislike
// @access  Private
router.put("/:id/comment/:comment_id/dislike", protect, async (req, res) => {
  try {
    const emptyTruckAd = await EmptyTruckAd.findById(req.params.id);
    if (!emptyTruckAd) return res.status(404).json({ message: "Empty truck ad not found" });

    const comment = emptyTruckAd.comments.id(req.params.comment_id);
    if (!comment) return res.status(404).json({ message: "Comment not found" });

    const alreadyLiked = comment.likes.some(like => like.user.toString() === req.user.id);
    const alreadyDisliked = comment.dislikes.some(dislike => dislike.user.toString() === req.user.id);

    // If user has liked, remove like
    if (alreadyLiked) {
      comment.likes = comment.likes.filter(like => like.user.toString() !== req.user.id);
    }

    // If user has not disliked, add dislike
    if (!alreadyDisliked) {
      comment.dislikes.unshift({ user: req.user.id });
    }
    // If already disliked, do nothing (no toggle)

    emptyTruckAd.markModified("comments");
    await emptyTruckAd.save();
    const updatedEmptyTruckAd = await EmptyTruckAd.findById(req.params.id)
      .populate("user", "name avatar")
      .populate({ path: "comments.user", select: "name avatar" })
      .populate({ path: "comments.replies.user", select: "name avatar" });
    res.json(updatedEmptyTruckAd);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Server Error" });
  }
});

// @desc    Dislike a reply on an empty truck ad
// @route   PUT /api/v1/emptytruckads/:id/comment/:comment_id/reply/:reply_id/dislike
// @access  Private
router.put("/:id/comment/:comment_id/reply/:reply_id/dislike", protect, async (req, res) => {
  try {
    const emptyTruckAd = await EmptyTruckAd.findById(req.params.id);
    if (!emptyTruckAd) return res.status(404).json({ message: "Empty truck ad not found" });

    const comment = emptyTruckAd.comments.id(req.params.comment_id);
    if (!comment) return res.status(404).json({ message: "Comment not found" });

    const reply = comment.replies.id(req.params.reply_id);
    if (!reply) return res.status(404).json({ message: "Reply not found" });

    const alreadyLiked = reply.likes.some(like => like.user.toString() === req.user.id);
    const alreadyDisliked = reply.dislikes.some(dislike => dislike.user.toString() === req.user.id);

    // If user has liked, remove like
    if (alreadyLiked) {
      reply.likes = reply.likes.filter(like => like.user.toString() !== req.user.id);
    }

    // If user has not disliked, add dislike
    if (!alreadyDisliked) {
      reply.dislikes.unshift({ user: req.user.id });
    }
    // If already disliked, do nothing (no toggle)

    emptyTruckAd.markModified("comments");
    await emptyTruckAd.save();
    const updatedEmptyTruckAd = await EmptyTruckAd.findById(req.params.id)
      .populate("user", "name avatar")
      .populate({ path: "comments.user", select: "name avatar" })
      .populate({ path: "comments.replies.user", select: "name avatar" });
    res.json(updatedEmptyTruckAd);
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server Error");
  }
});

// @desc    Show empty truck ad in home feed temporarily
// @route   POST /api/v1/emptytruckads/:id/show-in-feed
// @access  Private
router.post('/:id/show-in-feed', protect, async (req, res) => {
  try {
    const emptyTruckAd = await EmptyTruckAd.findById(req.params.id);
    
    if (!emptyTruckAd) {
      return res.status(404).json({ msg: 'Empty truck ad not found' });
    }

    emptyTruckAd.hiddenFromHomeFeedFor = emptyTruckAd.hiddenFromHomeFeedFor.filter(
      userId => userId.toString() !== req.user.id
    );
    
    await emptyTruckAd.save();
    res.json({ msg: 'Empty truck ad will now appear in your home feed', emptyTruckAd });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

// @desc    Hide empty truck ad from home feed
// @route   POST /api/v1/emptytruckads/:id/hide-from-feed
// @access  Private
router.post('/:id/hide-from-feed', protect, async (req, res) => {
  try {
    const emptyTruckAd = await EmptyTruckAd.findById(req.params.id);
    
    if (!emptyTruckAd) {
      return res.status(404).json({ msg: 'Empty truck ad not found' });
    }

    if (!emptyTruckAd.hiddenFromHomeFeedFor.includes(req.user.id)) {
      emptyTruckAd.hiddenFromHomeFeedFor.push(req.user.id);
      await emptyTruckAd.save();
    }
    
    res.json({ msg: 'Empty truck ad hidden from your home feed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

module.exports = router;

