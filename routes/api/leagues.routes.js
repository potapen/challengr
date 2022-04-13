const router = require("express").Router();

const League = require("../../models/League.model");
const Game = require("../../models/Game.model");
const Point = require("../../models/Point.model");
const getUser = require("../../middleware/getUser");
const fileUploader = require("../../config/cloudinary.config");
const isLeagueMember = require("../../middleware/isLeagueMember");
const cloudinary = require("cloudinary").v2;

// Returns all leagues the logged user is part of
router.get("/", getUser, async (req, res, next) => {
  try {
    const leagues = await League.find({
      members: req.user._id,
    }).populate("members");
    res.json({ leagues });
  } catch {
    next();
  }
});

// Creates a new league, and sets the logged user as a member
router.post(
  "/",
  getUser,
  fileUploader.single("coverPicture"),
  async (req, res, next) => {
    try {
      let { name, description } = req.body;
      const newLeague = {
        name,
        description,
        members: [],
      };
      // Add a picture field in case a file was submitted
      if (req.file) {
        let newImageUrl = cloudinary.url(req.file.filename, {
          width: 500,
          height: 500,
          gravity: "faces",
          crop: "fill",
        });
        newLeague.imageUrl = newImageUrl;
      }

      // Add current user as the first member
      newLeague.members.push(req.user._id);
      newLeagueDoc = await League.create(newLeague);

      // Invite key generation
      newLeague.inviteKey = newLeagueDoc._id;
      newLeagueDoc = await League.findByIdAndUpdate(
        newLeagueDoc._id,
        newLeague
      );

      // Set new Points for the new league
      const games = await Game.find();
      await Promise.all(
        games.map((game) => {
          return Point.create({ game: game._id, league: newLeagueDoc._id });
        })
      );

      res.status(201).json({ newLeagueDoc });
    } catch (error) {
      console.log(error);
      next();
    }
  }
);

// Edits a single league by id
router.put(
  "/:leagueId",
  getUser,
  isLeagueMember,
  fileUploader.single("coverPicture"),
  async (req, res, next) => {
    try {
      let { name, members, description } = req.body;

      const updatedLeague = {
        name,
        description,
      };
      if (members) {
        updatedLeague.members = members;
      }
      if (req.file) {
        let newImageUrl = cloudinary.url(req.file.filename, {
          width: 500,
          height: 500,
          gravity: "faces",
          crop: "fill",
        });
        if (newImageUrl) {
          updatedLeague.imageUrl = newImageUrl;
        }
      }
      const updatedLeagueDoc = await League.findByIdAndUpdate(
        req.league._id,
        updatedLeague,
        {
          new: true,
        }
      );
      res.json({ updatedLeagueDoc });
    } catch (error) {
      console.log(error);
      next();
    }
  }
);

// Remove the logged user from the league in the url
router.patch(
  "/:leagueId/leave",
  getUser,
  isLeagueMember,
  async (req, res, next) => {
    try {
      const league = req.league;
      league.members = league.members.filter(
        (member) => !member.equals(req.user._id)
      );
      await League.findByIdAndUpdate(req.league._id, league);

      res.status(200).send("Successfully left the league");
    } catch (error) {
      console.log(error);
      next();
    }
  }
);

// Adds the logged user to the league in the body
router.patch("/join", getUser, async (req, res, next) => {
  try {
    const { inviteKey } = req.body;
    const league = await League.findOne({ inviteKey: inviteKey });

    league.members.push(req.user._id);
    joinedLeague = await League.findByIdAndUpdate(inviteKey, league, {
      new: true,
    });

    res.status(200).send({ joinedLeague });
  } catch (error) {
    console.log(error);
    next();
  }
});

// Removes the logged user from the league in the url
router.delete("/:leagueId", getUser, isLeagueMember, async (req, res, next) => {
  try {
    const league = await League.findByIdAndDelete(req.league._id);
    res.status(200).send("Successfully deleted the league");
  } catch (error) {
    console.log(error);
    next();
  }
});

module.exports = router;