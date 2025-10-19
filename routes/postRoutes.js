
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { protect } = require('../middleware/authMiddleware');
const Post = require('../models/Post');
const User = require('../models/User'); // Assuming User model is needed for populating user info

// @desc    Create a new post
// @route   POST /api/v1/posts
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const { text, media } = req.body;

    // Check if user exists (optional, but good for data integrity)
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    const newPost = new Post({
      user: req.user.id,
      text,
      media: media || [], // media should be an array of { url, type: 'image' | 'video' }
    });

    const post = await newPost.save();
    res.status(201).json(post);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

// @desc    Get all posts by a specific user
// @route   GET /api/v1/posts/user/:userId
// @access  Private
router.get('/user/:userId', protect, async (req, res) => {
  try {
    const posts = await Post.find({ user: req.params.userId })
      .sort({ createdAt: -1 })
      .populate('user', ['name', 'avatar'])
      .populate({
        path: 'originalPost',
        populate: {
          path: 'user',
          select: 'name avatar'
        }
      });
    res.json(posts);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

// @desc    Get all posts
// @route   GET /api/v1/posts
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .populate('user', ['name', 'avatar'])
      .populate({
        path: 'originalPost',
        populate: {
          path: 'user',
          select: 'name avatar'
        }
      });
    res.json(posts);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

// @desc    Add/Remove a reaction to a post
// @route   PUT /api/v1/posts/:id/react
// @access  Private
router.put("/:id/react", protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ msg: "Post not found" });
    }

    const { reactionType } = req.body;
    if (!reactionType || !['like'].includes(reactionType)) {
      return res.status(400).json({ msg: "Invalid reaction type" });
    }

    // Check if the user has already reacted
    const existingReactionIndex = post.reactions.findIndex(
      (reaction) => reaction.user.toString() === req.user.id
    );

    if (existingReactionIndex > -1) {
      // User has already reacted, check if it's the same reaction type
      if (post.reactions[existingReactionIndex].type === reactionType) {
        // Same reaction type, remove it (toggle off)
        post.reactions.splice(existingReactionIndex, 1);
      } else {
        // Different reaction type, update it
        post.reactions[existingReactionIndex].type = reactionType;
      }
    } else {
      // User has not reacted, add new reaction
      post.reactions.unshift({ user: req.user.id, type: reactionType });
    }

    post.markModified("reactions");
    await post.save();
    const updatedPost = await Post.findById(req.params.id)
      .populate('user', ['name', 'avatar'])
      .populate('reactions.user', ['name', 'avatar'])
      .populate({
        path: 'comments.user',
        select: 'name avatar'
      })
      .populate({
        path: 'comments.replies.user',
        select: 'name avatar'
      });
    res.json(updatedPost);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// @desc    Add a comment to a post
// @route   POST /api/v1/posts/:id/comment
// @access  Private
router.post("/:id/comment", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    const post = await Post.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }
    if (!post) {
      return res.status(404).json({ msg: "Post not found" });
    }

    const newComment = {
      user: req.user.id,
      text: req.body.text,
    };

    post.comments.unshift(newComment);
    post.markModified("comments");
    await post.save();
    const updatedPost = await Post.findById(req.params.id)
      .populate("user", "name avatar")
      .populate({
        path: "comments.user",
        select: "name avatar"
      })
      .populate({
        path: "comments.replies.user",
        select: "name avatar"
      });
    res.json(updatedPost);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

// @desc    Delete a comment from a post
// @route   DELETE /api/v1/posts/:id/comment/:comment_id
// @access  Private
router.delete("/:id/comment/:comment_id", protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ msg: "Post not found" });
    }

    // Pull out comment
    const comment = post.comments.find(
      (comment) => comment.id === req.params.comment_id
    );

    // Make sure comment exists
    if (!comment) {
      return res.status(404).json({ msg: "Comment does not exist" });
    }

    // Check user
    if (comment.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: "User not authorized" });
    }

    // Get remove index
    const removeIndex = post.comments
      .map((comment) => comment._id.toString())
      .indexOf(req.params.comment_id);

    post.comments.splice(removeIndex, 1);

    post.markModified("comments");
    await post.save();
    const updatedPost = await Post.findById(req.params.id)
      .populate("user", "name avatar")
      .populate({
        path: "comments.user",
        select: "name avatar"
      })
      .populate({
        path: "comments.replies.user",
        select: "name avatar"
      });
    res.json(updatedPost);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// @desc    Like a comment
// @route   PUT /api/v1/posts/:id/comment/:comment_id/like
// @access  Private
router.put("/:id/comment/:comment_id/like", protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ msg: "Post not found" });
    }

    const comment = post.comments.id(req.params.comment_id);
    if (!comment) {
      return res.status(404).json({ msg: "Comment not found" });
    }

    // Check if the user has already liked this comment
    if (
      comment.likes.filter((like) => like.user.toString() === req.user.id)
        .length > 0
    ) {
      // User already liked, so unlike it
      comment.likes = comment.likes.filter(
        (like) => like.user.toString() !== req.user.id
      );
    } else {
      // User has not liked, so like it
      comment.likes.unshift({ user: req.user.id });
    }

    post.markModified("comments");
    await post.save();
    const updatedPost = await Post.findById(req.params.id)
      .populate("user", "name avatar")
      .populate({
        path: "comments.user",
        select: "name avatar"
      })
      .populate({
        path: "comments.replies.user",
        select: "name avatar"
      });
    res.json(updatedPost);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// @desc    Reply to a comment
// @route   POST /api/v1/posts/:id/comment/:comment_id/reply
// @access  Private
router.post("/:id/comment/:comment_id/reply", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    const post = await Post.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }
    if (!post) {
      return res.status(404).json({ msg: "Post not found" });
    }

    const comment = post.comments.id(req.params.comment_id);
    if (!comment) {
      return res.status(404).json({ msg: "Comment not found" });
    }

    const newReply = {
      user: req.user.id,
      text: req.body.text,
    };

    comment.replies.unshift(newReply);
    post.markModified("comments");
    await post.save();
    const updatedPost = await Post.findById(req.params.id)
      .populate("user", "name avatar")
      .populate({
        path: "comments.user",
        select: "name avatar"
      })
      .populate({
        path: "comments.replies.user",
        select: "name avatar"
      });
    res.json(updatedPost);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

// @desc    Like a reply
// @route   PUT /api/v1/posts/:id/comment/:comment_id/reply/:reply_id/like
// @access  Private
router.put("/:id/comment/:comment_id/reply/:reply_id/like", protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ msg: "Post not found" });
    }

    const comment = post.comments.id(req.params.comment_id);
    if (!comment) {
      return res.status(404).json({ msg: "Comment not found" });
    }

    const reply = comment.replies.id(req.params.reply_id);
    if (!reply) {
      return res.status(404).json({ msg: "Reply not found" });
    }

    // Check if the user has already liked this reply
    if (
      reply.likes.filter((like) => like.user.toString() === req.user.id)
        .length > 0
    ) {
      // User already liked, so unlike it
      reply.likes = reply.likes.filter(
        (like) => like.user.toString() !== req.user.id
      );
    } else {
      // User has not liked, so like it
      reply.likes.unshift({ user: req.user.id });
    }

    post.markModified("comments");
    await post.save();
    const updatedPost = await Post.findById(req.params.id)
      .populate("user", "name avatar")
      .populate({
        path: "comments.user",
        select: "name avatar"
      })
      .populate({
        path: "comments.replies.user",
        select: "name avatar"
      });
    res.json(updatedPost);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// @desc    Delete a reply from a comment
// @route   DELETE /api/v1/posts/:id/comment/:comment_id/reply/:reply_id
// @access  Private
router.delete("/:id/comment/:comment_id/reply/:reply_id", protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ msg: "Post not found" });
    }

    const comment = post.comments.id(req.params.comment_id);
    if (!comment) {
      return res.status(404).json({ msg: "Comment not found" });
    }

    const reply = comment.replies.id(req.params.reply_id);
    if (!reply) {
      return res.status(404).json({ msg: "Reply not found" });
    }

    // Check user
    if (reply.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: "User not authorized" });
    }

    comment.replies = comment.replies.filter(
      (r) => r._id.toString() !== req.params.reply_id
    );

    post.markModified("comments");
    await post.save();
    const updatedPost = await Post.findById(req.params.id)
      .populate("user", "name avatar")
      .populate({
        path: "comments.user",
        select: "name avatar"
      })
      .populate({
        path: "comments.replies.user",
        select: "name avatar"
      });
    res.json(updatedPost);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

// @desc    Delete a post
// @route   DELETE /api/v1/posts/:id
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ msg: 'Post not found' });
    }

    // Check user
    if (post.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized' });
    }

    await post.deleteOne(); // Use deleteOne() instead of remove()

    res.json({ msg: 'Post removed' });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Post not found' });
    }
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

// @desc    Get post by ID
// @route   GET /api/v1/posts/:id
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('user', ['name', 'avatar'])
      .populate({
        path: 'originalPost',
        populate: {
          path: 'user',
          select: 'name avatar'
        }
      })
      .populate({
        path: 'comments.user',
        select: 'name avatar'
      })
      .populate({
        path: 'comments.replies.user',
        select: 'name avatar'
      });

    if (!post) {
      return res.status(404).json({ msg: 'Post not found' });
    }

    res.json(post);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Post not found' });
    }
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

// @desc    Repost a post, shipment ad, or empty truck ad
// @route   POST /api/v1/posts/repost
// @access  Private
router.post('/repost', protect, async (req, res) => {
  try {
    const { text, originalPostId, originalPostType } = req.body;

    // Validate required fields
    if (!originalPostId || !originalPostType) {
      return res.status(400).json({ msg: 'Original post ID and type are required' });
    }

    // Validate originalPostType
    const validTypes = ['post', 'shipmentAd', 'emptyTruckAd'];
    if (!validTypes.includes(originalPostType)) {
      return res.status(400).json({ msg: 'Invalid original post type' });
    }

    // Map the type to the model name
    const modelMap = {
      'post': 'Post',
      'shipmentAd': 'ShipmentAd',
      'emptyTruckAd': 'EmptyTruckAd'
    };
    const modelName = modelMap[originalPostType];

    // Check if the original post exists
    const Model = mongoose.model(modelName);
    const originalPost = await Model.findById(originalPostId);
    if (!originalPost) {
      return res.status(404).json({ msg: 'Original post not found' });
    }

    // Check if user has already reposted this content
    const existingRepost = await Post.findOne({
      user: req.user.id,
      isRepost: true,
      originalPost: originalPostId,
      originalPostType: modelName
    });

    if (existingRepost) {
      return res.status(400).json({ msg: 'You have already reposted this content' });
    }

    // Create the repost
    const newRepost = new Post({
      user: req.user.id,
      text: text || '', // Optional comment on the repost
      isRepost: true,
      originalPost: originalPostId,
      originalPostType: modelName,
      repostText: text || '',
      media: [] // Reposts don't have their own media
    });

    const savedRepost = await newRepost.save();
    
    // Populate user info before sending response
    const populatedRepost = await Post.findById(savedRepost._id)
      .populate('user', ['name', 'avatar'])
      .populate({
        path: 'originalPost',
        populate: {
          path: 'user',
          select: 'name avatar'
        }
      });

    res.status(201).json(populatedRepost);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Original post not found' });
    }
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

// @desc    Update a post
// @route   PUT /api/v1/posts/:id
// @access  Private
router.put('/:id', protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ msg: 'Post not found' });
    }

    // Check user authorization
    if (post.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized' });
    }

    // Don't allow editing reposts
    if (post.isRepost) {
      return res.status(400).json({ msg: 'Cannot edit a repost' });
    }

    const { text, media } = req.body;

    // Update fields
    if (text !== undefined) {
      post.text = text;
    }
    if (media !== undefined) {
      post.media = media;
    }

    await post.save();

    // Return updated post with populated fields
    const updatedPost = await Post.findById(req.params.id)
      .populate('user', ['name', 'avatar'])
      .populate({
        path: 'originalPost',
        populate: {
          path: 'user',
          select: 'name avatar'
        }
      });

    res.json(updatedPost);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Post not found' });
    }
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

module.exports = router;

