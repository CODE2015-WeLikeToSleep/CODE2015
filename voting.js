/*
 * Global variables
 * cachedVoteListing - a hash of voteListing, keyed on a string like "p41.s1"
 */
cachedVoteListing = {}

// TODO add function comment
function voteListingFromXml(xmlVoteListing) {
	var data = [];
	var detailResource='http://www.parl.gc.ca/HouseChamberBusiness/Chambervotedetail.aspx';
	$(xmlVoteListing).find('Votes').each(function(){
		$(this).find('Vote').each(function(){
			var vote = {
				description: $(this).find('Description').text(),
				decision: $(this).find('Decision').text(),
				bill: $(this).find('RelatedBill').attr('number'),
				yeas: Number($(this).find('TotalYeas').text()),
				nays: Number($(this).find('TotalNays').text()),
				paired: $(this).find('TotalPaired').text(),
				voteNumber: $(this).attr('number'),
				parliament: $(this).attr('parliament'),
				session: $(this).attr('session'),
				sitting: $(this).attr('sitting'),
				date: $(this).attr('date'),
			};
			// you could add &xml=True if you wanted XML.
			vote['url'] = detailResource + "?Language=E&Mode=1&Parl="+vote.parliament+"&Ses="+vote.session+"&FltrParl="+vote.parliament+"&FltrSes="+vote.session+"&vote="+vote.voteNumber;

			// we only care about votes on bills!
			// TODO: maybe we only care about the most recent bill?
			if (vote.bill == null) {return;}

			data.push(vote);
		});
	});	
	return data;
}

/**
 * Produce JSON-style voting data from the XML document provided by Government of Canada.
 * @param {XML} dataXML
 * @return {Array} dataJson
 */
function voteJsonFromVoteXml(dataXML) {
	var allVotes = [];
	$(dataXML).find('Vote').each(function(){
		// var sponsor = $(this).find('Sponsor').text();
		// var decision = $(this).find('Decision').text();
		// var bill = $(this).find('RelatedBill').attr('number');
		$(this).find('Participant').each(function(){
			allVotes.push({
				name: $(this).find("Name").text(),
				first: $(this).find("FirstName").text(),
				last: $(this).find("LastName").text(),
				constituency: $(this).find("Constituency").text(),
				province: $(this).find("Province").text(),
				provinceCode: $(this).find("Province").attr('code'),
				party: $(this).find("Party").text(),
				yea: Number($(this).find("RecordedVote").find("Yea").text()),
				nay: Number($(this).find("RecordedVote").find("Nay").text()),
				paired: Number($(this).find("RecordedVote").find("Paired").text()),
				url: '',
			});
		});
	});
	return allVotes;
	// [
	// 	  {party: 'NDP', yea: 30, nay: 0},
	// 	  {party: 'Liberal', yea: 0, nay: 60},
	//    ...
	// ]
}

/**
 * Produce JSON-style voting data from the XML document provided by Government of Canada.
 * Summarize the votes by party, discarding information about specific members. We use this to
 * represent both actual and hypothetical vote results.
 * BIG TODO: add an attribute indicating whether this is a real or hypothetical result
 * @param {Array} allVotes
 * @return {VotesByParty}
 */
function summarizeVotesByParty(allVotes) {
	return allVotes
		.reduce(function(prev, cur, ix, array) {
			var foo = prev;
			foo[cur.party] = foo[cur.party] || { yea:0, nay:0 };
			foo[cur.party]['yea'] += cur.yea;
			foo[cur.party]['nay'] += cur.nay;
			return foo;
		}, {});
}

/**
 * Sometimes you just want a vote summary on the console.
 * @param {VotesByParty} VotesByParty
 */
function prettyPrintVote(votesByParty) {
	for (party in votesByParty) {
		var yea = votesByParty[party]['yea'];
		var nay = votesByParty[party]['nay'];
		console.log(party+": "+yea+" yay. "+nay+" nay. ("+(yea+nay)+" total)");
	}
}

/**
 * Derive a new per-party voting outcome based on a hypothetical alternate parliament.
 * @param {VotesByParty} votesByParty
 * @param {VotesByParty}
 */
function scaleVote(votesByParty, altParliament) {
	// Calculate membership of the point-in-time parliament based on counted votes
	var actualParliament = parliamentFromVotes(votesByParty);
	appendParliamentRatios(actualParliament); // TODO: it's really awkward remembering to do this
	var newVote = {};
	// TODO: for..in only works because I'm constructing a trivial object.
	// If it was a better object, I would need to use a better iterator.
	for (party in votesByParty) {
		if (typeof altParliament[party] == 'undefined') {
			console.log("Party gap mismatch " + party);
			continue;
		}
		var scaleFactor = altParliament[party]['influence'] / actualParliament[party]['influence'];
		newVote[party] = {
			yea: Math.round(votesByParty[party]['yea'] * scaleFactor),
			nay: Math.round(votesByParty[party]['nay'] * scaleFactor)
		};
	}
	return newVote;
}

/**
 * Realize that the members who participate in any given vote effective
 * make up an instance of parliament. So you can apply the same treatment to the
 * effective parliament of a given day as you would to the elected parliament.
 * @param {VotesByParty} voteSummary
 * @return {Parliament}
 */
function parliamentFromVotes(votesByParty) {
	var parliament = {};
	for (party in votesByParty) {
		totalVotes = votesByParty[party].yea + votesByParty[party].nay;
		parliament[party] = {seats: totalVotes};
	}
	return parliament;
}

/**
 * Augment a parliament object with ratio calculations.
 * TODO: make this part of the parliament object. It's awkward right now.
 * @param {Parliament} parliament
 * @return {Parliament} parliament
 */
function appendParliamentRatios(parliament) {
	var totalSeats = 0;
	for (party in parliament) {
		totalSeats += parliament[party]['seats'];
	}
	for (party in parliament) {
		parliament[party]['influence'] = parliament[party]['seats'] / totalSeats;
	}
	return parliament;
}

/**
 * To make a pie chart in D3.js, the data needs to be presented slightly differently.
 * @param {VoteSummary} voteSummary
 * @return {Object} pieData
 */
function pieDataFromVoteSummary(votesByParty) {
	var yea = 0;
	var nay = 0;
	var results = [];
	var partyColours = {
		'NDP.yea': '#FF6600',
		'NDP.nay': '#DDDDDD',
		'Liberal.yea': '#DB0B27',
		'Liberal.nay': '#DDDDDD',
		'Conservative.yea': '#144897',
		'Conservative.nay': '#DDDDDD',
		'Green Party.yea': '#2D9C44',
		'Green Party.nay': '#DDDDDD',
		'Bloc Québécois.yea': '#0998F8',
		'Bloc Québécois.nay': '#DDDDDD',
		'Forces et Démocratie.yea': 'red',
		'Forces et Démocratie.nay': '#DDDDDD',
		'Conservative Independent.yea': 'yellow',
		'Conservative Independent.nay': '#DDDDDD',
		'Independent.yea': 'yellow',
		'Independent.nay': '#DDDDDD'
	};
	for (party in votesByParty) {
		results.push({
			party: party,
			vote: 'yea',
			count: votesByParty[party].yea,
			colour: partyColours[party + '.yea'],
		});
		results.push({
			party: party,
			vote: 'nay',
			count: votesByParty[party].nay,
			colour: partyColours[party + '.nay'],
		});
	}
	return results;
}

/**
 * Use D3.js to render a pie chart of a vote summary.
 * @param {String} elementSelector
 * @param {VoteSummary} voteSummary
 * @param {boolean} reverse sort order
 */
function renderPieVoteSummary(elementSelector, voteSummary, reverse) {
	var pieData = pieDataFromVoteSummary(voteSummary);

	var width = 200;
	var height = 200;
	var radius = Math.min(width, height) / 2;

	var svg = d3.select(elementSelector)
		.attr("width", width)
		.attr("height", height)
		.append('g')
		.attr('transform', 'translate(' + (width / 2) + ',' + (height / 2) + ')');

	var arc = d3.svg.arc()
		.outerRadius(radius);

	if (reverse) {
		var sortMultiple = -1;
	} else {
		var sortMultiple = 1;
	}

	var pie = d3.layout.pie()
		.value(function(d) { return d.count; })
		.sort(function (a,b){
			order1 = b.vote.localeCompare(a.vote) * sortMultiple;
			order2 = b.party.localeCompare(a.party) * sortMultiple;
			if (order1 != 0) {
				return order1;
			} else {
				return order2;
			}
		});

	var path = svg.selectAll('path')
		.data(pie(pieData))
		.enter()
		.append('path')
		.attr('d', arc)
		.attr('class', function(d,i){return d.data.party;})
		.attr('fill', function(d,i){return d.data.colour;});
}

// Right now, this alternate parliament is completely imaginary.
// TODO: We will derive a hypothetical parliament by applying an alternate electoral
// system to the per-riding elections data (will be obtained elsewhere).
var alternateParliament = {
	'Forces et Démocratie': {seats: 0},
	'Bloc Québécois': {seats: 6},
	'Conservative': {seats: 139},
	'Conservative Independent': {seats: 8},
	'Green Party': {seats: 8},
	'Independent': {seats: 14},
	'Liberal': {seats: 44},
	'NDP': {seats: 108}
};