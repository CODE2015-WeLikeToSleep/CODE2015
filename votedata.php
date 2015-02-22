<?php
header('Content-Type: application/json; charset=UTF-8');

// TODO: get as input
if (!(isset($_GET["p"]) and isset($_GET["s"]) and isset($_GET["v"]))) {
    // FIX ME
}

$parliament = $_GET["p"];
$session = $_GET["s"];
$vote = $_GET["v"];

$mysqli = new mysqli("localhost", "root", "code2015", "code2015");

if ($mysqli->connect_errno) {
    echo "Failed to connect to MySQL: (" . $mysqli->connect_errno . ") " . $mysqli->connect_error;
}

/* Prepared statement, stage 1: prepare */
if (!($stmt = $mysqli->prepare("SELECT decision, con_yes, con_no, con_paired, " .
                               "lib_yes, lib_no, lib_paired, ndp_yes, ndp_no, ndp_paired, " .
                               "bqc_yes, bqc_no, bqc_paired, grp_yes, grp_no, grp_paired, " .
                               "otr_yes, otr_no, otr_paired" .
                               " FROM parliament_votes " .
                               " WHERE parl_number=? AND session_number=? AND vote_number=?"))) {
    echo "Prepare failed: (" . $mysqli->errno . ") " . $mysqli->error;
}

if (!$stmt->bind_param("sss", $parliament, $session, $vote)) {
    echo "Binding parameters failed: (" . $stmt->errno . ") " . $stmt->error;
}

if (!$stmt->execute()) {
    echo "Execute failed: (" . $stmt->errno . ") " . $stmt->error;
}

$stmt->bind_result($decision, $con_yes, $con_no, $con_paired, $lib_yes, $lib_no, $lib_paired,
                   $ndp_yes, $ndp_no, $ndp_paired, $bqc_yes, $bqc_no, $bqc_paired, $grp_yes,
                   $grp_no, $grp_paired, $otr_yes, $otr_no, $otr_paired);

$json = "";
while ($stmt->fetch()) {
    $json = json_encode(['parliament' => $parliament,
                         'session' => $session,
                         'vote' => $vote,
                         'decision' => $decision,
                         'details' => [['party' => 'conservative', 'yea' => $con_yes, 'nay'=> $con_no],
                                       ['party' => 'liberal', 'yea' => $lib_yes, 'nay'=> $lib_no],
                                       ['party' => 'ndp', 'yea' => $ndp_yes, 'nay'=> $ndp_no],
                                       ['party' => 'bloc quebecois', 'yea' => $bqc_yes, 'nay'=> $bqc_no],
                                       ['party' => 'green party', 'yea' => $grp_yes, 'nay'=> $grp_no],
                                       ['party' => 'other', 'yea' => $otr_yes, 'nay'=> $otr_no]]]);
    echo $json;
}

return $json;
