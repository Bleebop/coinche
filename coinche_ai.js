const coinche = require("./coinche_rules_server.js");

class random_player {
	constructor(position) {
		this.position = position;
		this.is_ai = true;
	}
	
	ai_play(trick, contract, hand, play_history) {
		let playable_cards = coinche.allowed_cards(trick, contract.trump, hand);
		let card = playable_cards[Math.floor(Math.random()*playable_cards.length)];
		return [card.id, this.position, ""];
	}
	
	ai_bid(play_history) {
		let min_points = 80;
		let pass = false;
		let bid = {
			bidder: this.position,
			points: 0,
			trump: ""
		};
		let raises = [0, 10, 20, 30];
		if (play_history.bids.length != 0) {
			min_points = play_history.bids[play_history.bids.length-1].points + 10;
		}
		if (min_points === 260) {
			pass = true;
		} else {
			let prob_pass = (1 - (5/(min_points - 70)));
			pass = (Math.random() < prob_pass);
		}
		if (!pass) {
			let raise = raises[Math.floor(Math.random()*4)];
			let trump = coinche.trumps[Math.floor(Math.random()*6)];
			bid.points = min_points + raise;
			if (bid.points > 180) {
				bid.points = 250;
			}
			bid.trump = trump;
		}
		return bid;
	}
	
	ai_coinche(play_history) {
		let prob_coinche = 1/30;
		return (Math.random() < prob_coinche);
	}
	
	ai_surcoinche(play_history) {
		let prob_surcoinche = 1/10;
		return (Math.random() < prob_surcoinche);
	}
}

class human_player {
	constructor(position, socketId) {
		this.position = position;
		this.socketId = socketId;
		this.is_ai = false;
	}
}



module.exports = {
	random_player,
	human_player
}

