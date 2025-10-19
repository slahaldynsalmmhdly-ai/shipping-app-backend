const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const ShipmentAd = require("../models/ShipmentAd");
const User = require("../models/User"); // Assuming User model is needed for populating user info

// @desc    Create a new shipment ad
// @route   POST /api/v1/shipmentads
// @access  Private
router.post("/", protect, async (req, res) => {
  try {
    const {
      pickupLocation,
      deliveryLocation,
      pickupDate,
      truckType,
      description,
      media,
    } = req.body;

    // Check if user exists (optional, but good for data integrity)
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    const newShipmentAd = new ShipmentAd({
      user: req.user.id,
      pickupLocation,
      deliveryLocation,
      pickupDate,
      truckType,
      description,
      media: media || [], // media should be an array of { url, type: \'image\' | \'video\' }
    });

    const shipmentAd = await newShipmentAd.save();
    res.status(201).json(shipmentAd);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: "Server Error", error: err.message });
  }
});

// @desc    Get all shipment ads by a specific user
// @route   GET /api/v1/shipmentads/user/:userId
// @access  Private
router.get("/user/:userId", protect, async (req, res) => {
  try {
    const shipmentAds = await ShipmentAd.find({ user: req.params.userId })
      .sort({ createdAt: -1 })
      .populate("user", ["name", "avatar"]);
    res.json(shipmentAds);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: "Server Error", error: err.message });
  }
});

// @desc    Get all shipment ads
// @route   GET /api/v1/shipmentads
// @access  Private
router.get("/", protect, async (req, res) => {
  try {
    const shipmentAds = await ShipmentAd.find()
      .sort({ createdAt: -1 })
      .populate("user", ["name", "avatar"]);
    res.json(shipmentAds);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: "Server Error", error: err.message });
  }
});

// @desc    Get shipment ad by ID
// @route   GET /api/v1/shipmentads/:id
// @access  Private
router.get("/:id", protect, async (req, res) => {
  try {
    const shipmentAd = await ShipmentAd.findById(req.params.id)
      .populate("user", ["name", "avatar"])
      .populate({
        path: "comments.user",
        select: "name avatar"
      })
      .populate({
        path: "comments.replies.user",
        select: "name avatar"
      });

    if (!shipmentAd) {
      return res.status(404).json({ msg: "Shipment ad not found" });
    }

    res.json(shipmentAd);
  } catch (err) {
    console.error(err.message);
    if (err.kind === "ObjectId") {
      return res.status(404).json({ msg: "Shipment ad not found" });
    }
    res.status(500).json({ message: "Server Error", error: err.message });
  }
});

// @desc    Repost a shipment ad (create a copy with new date)
// @route   POST /api/v1/shipmentads/:id/repost
// @access  Private
router.post("/:id/repost", protect, async (req, res) => {
  try {
    const originalAd = await ShipmentAd.findById(req.params.id);

    if (!originalAd) {
      return res.status(404).json({ msg: "Shipment ad not found" });
    }

    // Check user authorization
    if (originalAd.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: "User not authorized" });
    }

    // Create a new ad with the same data but new createdAt
    const repostedAd = new ShipmentAd({
      user: originalAd.user,
      pickupLocation: originalAd.pickupLocation,
      deliveryLocation: originalAd.deliveryLocation,
      pickupDate: originalAd.pickupDate,
      truckType: originalAd.truckType,
      description: originalAd.description,
      media: originalAd.media,
    });

    await repostedAd.save();
    const populatedAd = await ShipmentAd.findById(repostedAd._id).populate("user", ["name", "avatar"]);
    res.status(201).json(populatedAd);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: "Server Error", error: err.message });
  }
});

// @desc    Add/Remove a reaction to a shipment ad
// @route   PUT /api/v1/shipmentads/:id/react
// @access  Private
router.put("/:id/react", protect, async (req, res) => {
  try {
    const shipmentAd = await ShipmentAd.findById(req.params.id);
    if (!shipmentAd) {
      return res.status(404).json({ msg: "Shipment ad not found" });
    }

    const { reactionType } = req.body;
    if (!reactionType || !["like"].includes(reactionType)) {
      return res.status(400).json({ msg: "Invalid reaction type" });
    }

    // Check if the user has already reacted
    const existingReactionIndex = shipmentAd.reactions.findIndex(
      (reaction) => reaction.user.toString() === req.user.id
    );

    if (existingReactionIndex > -1) {
      // User has already reacted, check if it's the same reaction type
      if (shipmentAd.reactions[existingReactionIndex].type === reactionType) {
        // Same reaction type, remove it (toggle off)
        shipmentAd.reactions.splice(existingReactionIndex, 1);
      } else {
        // Different reaction type, update it
        shipmentAd.reactions[existingReactionIndex].type = reactionType;
      }
    } else {
      // User has not reacted, add new reaction
      shipmentAd.reactions.unshift({ user: req.user.id, type: reactionType });
    }

    shipmentAd.markModified("reactions");
    await shipmentAd.save();

    const updatedShipmentAd = await ShipmentAd.findById(req.params.id)
      .populate("user", ["name", "avatar"])
      .populate("reactions.user", ["name", "avatar"]);

    res.json(updatedShipmentAd);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// @desc    Add a comment to a shipment ad
// @route   POST /api/v1/shipmentads/:id/comment
// @access  Private
router.post("/:id/comment", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    const shipmentAd = await ShipmentAd.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }
    if (!shipmentAd) {
      return res.status(404).json({ msg: "Shipment ad not found" });
    }

    const newComment = {
      user: req.user.id,
      text: req.body.text,
    };

    shipmentAd.comments.unshift(newComment);
    shipmentAd.markModified("comments");
    await shipmentAd.save();
    const updatedShipmentAd = await ShipmentAd.findById(req.params.id)
      .populate("user", "name avatar")
      .populate({
        path: "comments.user",
        select: "name avatar"
      })
      .populate({
        path: "comments.replies.user",
        select: "name avatar"
      });
    res.json(updatedShipmentAd);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

// @desc    Delete a comment from a shipment ad
// @route   DELETE /api/v1/shipmentads/:id/comment/:comment_id
// @access  Private
router.delete("/:id/comment/:comment_id", protect, async (req, res) => {
  try {
    const shipmentAd = await ShipmentAd.findById(req.params.id);

    if (!shipmentAd) {
      return res.status(404).json({ msg: "Shipment ad not found" });
    }

    const comment = shipmentAd.comments.find(
      (comment) => comment.id === req.params.comment_id
    );

    if (!comment) {
      return res.status(404).json({ msg: "Comment does not exist" });
    }

    if (comment.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: "User not authorized" });
    }

    const removeIndex = shipmentAd.comments
      .map((comment) => comment._id.toString())
      .indexOf(req.params.comment_id);

    shipmentAd.comments.splice(removeIndex, 1);

    shipmentAd.markModified("comments");
    await shipmentAd.save();
    const updatedShipmentAd = await ShipmentAd.findById(req.params.id)
      .populate("user", "name avatar")
      .populate({
        path: "comments.user",
        select: "name avatar"
      })
      .populate({
        path: "comments.replies.user",
        select: "name avatar"
      });
    res.json(updatedShipmentAd);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// @desc    Like a comment on a shipment ad
// @route   PUT /api/v1/shipmentads/:id/comment/:comment_id/like
// @access  Private
router.put("/:id/comment/:comment_id/like", protect, async (req, res) => {
  try {
    const shipmentAd = await ShipmentAd.findById(req.params.id);
    if (!shipmentAd) {
      return res.status(404).json({ msg: "Shipment ad not found" });
    }

    const comment = shipmentAd.comments.id(req.params.comment_id);
    if (!comment) {
      return res.status(404).json({ msg: "Comment not found" });
    }

    if (
      comment.likes.filter((like) => like.user.toString() === req.user.id)
        .length > 0
    ) {
      comment.likes = comment.likes.filter(
        (like) => like.user.toString() !== req.user.id
      );
    } else {
      comment.likes.unshift({ user: req.user.id });
    }

    shipmentAd.markModified("comments");
    await shipmentAd.save();
    const updatedShipmentAd = await ShipmentAd.findById(req.params.id)
      .populate("user", "name avatar")
      .populate({
        path: "comments.user",
        select: "name avatar"
      })
      .populate({
        path: "comments.replies.user",
        select: "name avatar"
      });
    res.json(updatedShipmentAd);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// @desc    Reply to a comment on a shipment ad
// @route   POST /api/v1/shipmentads/:id/comment/:comment_id/reply
// @access  Private
router.post("/:id/comment/:comment_id/reply", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    const shipmentAd = await ShipmentAd.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }
    if (!shipmentAd) {
      return res.status(404).json({ msg: "Shipment ad not found" });
    }

    const comment = shipmentAd.comments.id(req.params.comment_id);
    if (!comment) {
      return res.status(404).json({ msg: "Comment not found" });
    }

    const newReply = {
      user: req.user.id,
      text: req.body.text,
    };

    comment.replies.unshift(newReply);
    shipmentAd.markModified("comments");
    await shipmentAd.save();
    const updatedShipmentAd = await ShipmentAd.findById(req.params.id)
      .populate("user", "name avatar")
      .populate({
        path: "comments.user",
        select: "name avatar"
      })
      .populate({
        path: "comments.replies.user",
        select: "name avatar"
      });
    res.json(updatedShipmentAd);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

// @desc    Like a reply on a shipment ad
// @route   PUT /api/v1/shipmentads/:id/comment/:comment_id/reply/:reply_id/like
// @access  Private
router.put(":id/comment/:comment_id/reply/:reply_id/like", protect, async (req, res) => {
  try {
    const shipmentAd = await ShipmentAd.findById(req.params.id);
    if (!shipmentAd) {
      return res.status(404).json({ msg: "Shipment ad not found" });
    }

    const comment = shipmentAd.comments.id(req.params.comment_id);
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

    shipmentAd.markModified("comments");
    await shipmentAd.save();
    const updatedShipmentAd = await ShipmentAd.findById(req.params.id)
      .populate("user", "name avatar")
      .populate({
        path: "comments.user",
        select: "name avatar"
      })
      .populate({
        path: "comments.replies.user",
        select: "name avatar"
      });
    res.json(updatedShipmentAd);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// @desc    Delete a reply from a comment on a shipment ad
// @route   DELETE /api/v1/shipmentads/:id/comment/:comment_id/reply/:reply_id
// @access  Private
router.delete(":id/comment/:comment_id/reply/:reply_id", protect, async (req, res) => {
  try {
    const shipmentAd = await ShipmentAd.findById(req.params.id);
    if (!shipmentAd) {
      return res.status(404).json({ msg: "Shipment ad not found" });
    }

    const comment = shipmentAd.comments.id(req.params.comment_id);
    if (!comment) {
      return res.status(404).json({ msg: "Comment not found" });
    }

    const reply = comment.replies.id(req.params.reply_id);
    if (!reply) {
      return res.status(404).json({ msg: "Reply not found" });
    }

    if (reply.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: "User not authorized" });
    }

    comment.replies = comment.replies.filter(
      (r) => r._id.toString() !== req.params.reply_id
    );

    shipmentAd.markModified("comments");
    await shipmentAd.save();
    const updatedShipmentAd = await ShipmentAd.findById(req.params.id)
      .populate("user", "name avatar")
      .populate({
        path: "comments.user",
        select: "name avatar"
      })
      .populate({
        path: "comments.replies.user",
        select: "name avatar"
      });
    res.json(updatedShipmentAd);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

// @desc    Delete a shipment ad
// @route   DELETE /api/v1/shipmentads/:id
// @access  Private
router.delete("/:id", protect, async (req, res) => {
  try {
    const shipmentAd = await ShipmentAd.findById(req.params.id);

    if (!shipmentAd) {
      return res.status(404).json({ msg: "Shipment ad not found" });
    }

    // Check user
    if (shipmentAd.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: "User not authorized" });
    }

    await shipmentAd.deleteOne();

    res.json({ msg: "Shipment ad removed" });
  } catch (err) {
    console.error(err.message);
    if (err.kind === "ObjectId") {
      return res.status(404).json({ msg: "Shipment ad not found" });
    }
    res.status(500).json({ message: "Server Error", error: err.message });
  }
});

module.exports = router;

