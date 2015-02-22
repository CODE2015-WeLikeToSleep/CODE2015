/*
 * Global variables
 * cachedVoteListing - a hash of voteListing, keyed on a string like "p41.s1"
 */
cachedVoteListing = {}

partySortIndex = {
	'Conservative': 1,
	'NDP': 2,
	'Liberal': 3,
	'Green Party': 4,
	'Bloc Québécois': 5,
	'Conservative Independent': 6,
	'Independent': 6,
	'Forces et Démocratie': 7
}

partyColours = {
	'ndp.YEA': '#FF6600',
	'ndp.NAY': '#DDDDDD',
	'liberal.YEA': '#DB0B27',
	'liberal.NAY': '#DDDDDD',
	'conservative.YEA': '#144897',
	'conservative.NAY': '#DDDDDD',
	'green party.YEA': '#2D9C44',
	'green party.NAY': '#DDDDDD',
	'bloc quebecois.YEA': '#0998F8',
	'bloc quebecois.NAY': '#DDDDDD',
	'other.YEA': '#144897',
	'other.NAY': '#DDDDDD',
};

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
 * To make a pie chart in D3.js, the data needs to be presented slightly differently.
 * @param {VoteSummary} voteSummary
 * @return {Object} pieData
 */
function pieDataFromVoteSummary(chamberVoteDetail) {
	var yea = 0;
	var nay = 0;
	var results = [];
	chamberVoteDetail.votes.forEach(function(value,ix,array){
		results.push({
			party: value.party,
			vote:  value.voteType,
			count: value.count,
			colour: partyColours[value.party+'.'+value.voteType]
			// TODO: mixing ENUM and strings is a bad bad plan!
		});
	});
	return results;
}

/**
 * Use D3.js to render a pie chart of a vote summary.
 * @param {String} elementSelector
 * @param {VoteSummary} voteSummary
 * @param {boolean} reverse sort order
 */
function renderPieVoteSummary(elementSelector, chamberVoteDetail, reverse) {
	var pieData = pieDataFromVoteSummary(chamberVoteDetail);

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

/**
 * Use D3.js to draw the composition of a parliament.
 * @param {String} elementSelector
 * @param {Parliament} parliament
 */
function renderParliament(elementSelector, parliament) {
	// A parliament is a hash, not an array. But D3.js can ONLY read arrays. so we make an array.
	var chartData = Object.keys(parliament.parties).map(function(cur,ix,array) {
		entry = parliament.parties[cur];
		entry['party'] = cur;
		return entry;
	});

	chartData.sort(function(a,b) {
		//return a.party.localeCompare(b.party);
		return partySortIndex[a.party] - partySortIndex[b.party];
	})

	var width = 200;
	var height = 200;

	var svg = d3.select(elementSelector)
		.attr("width", width)
		.attr("height", height);

	var rect = svg.selectAll('rect')
		.data(chartData)
		.enter()
		.append('rect')
		.attr('transform', function(d, i) { return "translate(0," + i * 10 + ")"; })
		.attr('x', 0)
		.attr('width', function(d,i){return d.seats;})
		.attr('height', 10)
		.attr('class', 'rectclass')
		.attr('fill', function(d,i){return partyColours[d.party+'.YEA'];});
}

// Right now, this alternate parliament is completely imaginary.
// TODO: We will derive a hypothetical parliament by applying an alternate electoral
// system to the per-riding elections data (will be obtained elsewhere).
var alternateParliament = new Parliament();
alternateParliament.parties = {
	'bloc quebecois': {seats: 6},
	'conservative': {seats: 139},
	'green party': {seats: 8},
	'other': {seats: 14},
	'liberal': {seats: 44},
	'ndp': {seats: 108}
};
