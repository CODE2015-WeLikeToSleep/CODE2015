// TODO: show what 'influence' looks like

function Parliament() {
	this.parties = {}; // each party hash has "seats" and "influence"
}

/**
 * Augment a parliament object with ratio calculations.
 * @param {Parliament} parliament
 * @return {Parliament} parliament
 */
Parliament.prototype.appendRatios = function appendParliamentRatios(parliament) {
	var totalSeats = 0;
	var goodParties = [];
	for (party in this.parties) {
		var seats = this.parties[party]['seats'];
		if (seats > 0) {
			totalSeats += seats;
		} else {
			console.log('TODO: How do I throw a NaN exception?');
			continue;
		}
		goodParties.push(party);
	}
	for (party in goodParties) {
		this.parties[party]['influence'] = this.parties[party]['seats'] / totalSeats;
	}
}