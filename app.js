const express = require("express");
const path = require("path");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const app = express();
app.use(express.json());
const dbPath = path.join(__dirname, "cricketMatchDetails.db");

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(8000, () => {
      console.log("Server Running at http://localhost:8000/");
    });
  } catch (e) {
    console.log(`Database Error: ${e.message}`);
    process.exit(1);
  }
};
initializeDBAndServer();

const convertPlayerDbObjectToResponseObject = (dbObject) => {
  return {
    playerId: dbObject.player_id,
    playerName: dbObject.player_name,
  };
};

const convertMatchDbObjectToResponseObject = (dbObject) => {
  return {
    matchId: dbObject.match_id,
    match: dbObject.match,
    year: dbObject.year,
  };
};

app.get("/players/", async (request, response) => {
  const getPlayerQuery = `SELECT * FROM player_details`;

  const playersArray = await db.all(getPlayerQuery);
  response.send(
    playersArray.map((eachPlayer) =>
      convertPlayerDbObjectToResponseObject(eachPlayer)
    )
  );
});

app.get("/players/:playerId/", async (request, response) => {
  const { playerId } = request.params;
  const getPlayerQuery = `SELECT * FROM player_details WHERE player_id =${playerId}`;

  const player = await db.get(getPlayerQuery);
  response.send(convertPlayerDbObjectToResponseObject(player));
});

app.put("/players/:playerId/", async (request, response) => {
  const { playerId } = request.params;
  const { playerName } = request.body;
  const updatePlayerQuery = `UPDATE player_details SET player_name WHERE player_id =${playerId}`;

  await db.run(updatePlayerQuery);
  response.send("Player Details Updated");
});

app.get("/matches/:matchId/", async (request, response) => {
  const { matchId } = request.params;
  const matchDetailsQuery = `
    SELECT
    *
    FROM
    match_details
    WHERE
    match_id =${matchId};`;
  const matchDetails = await db.get(matchDetailsQuery);
  response.send(convertMatchDbObjectToResponseObject(matchDetails));
});

app.get("/players/:playerId/matches/", async (request, response) => {
  const { playerId } = request.params;
  const getPlayerMatchesQuery = `
    SELECT
    *
    FROM
    player_match_score NATURAL JOIN match_details
    WHERE
    player_id =${playerId};`;
  const playerMatches = await db.all(getPlayerMatchesQuery);

  response.send(
    playerMatches.map((eachMatch) =>
      convertMatchDbObjectToResponseObject(eachMatch)
    )
  );
});

app.get("/matches/:matchId/players/", async (request, response) => {
  const { matchId } = request.params;
  const getMatchPlayerQuery = `
    SELECT
    player_details.player_id AS playerId,
	player_details.player_name AS playerName
    FROM
    player_match_score NATURAL JOIN player_details
    WHERE
    match_id =${matchId};`;
  const playerArray = await db.all(getMatchPlayerQuery);

  response.send(
    playerArray.map((eachMatch) =>
      convertPlayerDbObjectToResponseObject(eachMatch)
    )
  );
});

app.get("/players/:playerId/matches/", async (request, response) => {
  const { playerId } = request.params;
  const getMatchPlayersQuery = `
    SELECT
    player_details.player_id AS playerId,
    player_details.player_name AS playerName,
    SUM(player_match_score.score) AS totalScore,
    SUM(fours) AS totalFours,
    SUM(sixes) AS totalSixes FROM 
    player_details INNER JOIN player_match_score ON
    player_details.player_id = player_match_score.player_id
    WHERE player_details.player_id = ${playerId};`;
  const playerMatchDetails = await db.get(getMatchPlayersQuery);

  response.send(playerMatchDetails);
});

module.exports = app;
