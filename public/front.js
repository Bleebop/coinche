var socket = io();

div_area = document.getElementById("play_area");
for (card_id of belote_deck.cards.keys()) {
	const card_img = document.createElement("img");
	card_img.setAttribute("class", "card");
	card_img.setAttribute("id", card_id);
	card_img.setAttribute("src", "images/" + card_id + ".png");
	card_img.setAttribute("width", "169");
	card_img.setAttribute("height", "245");
	div_area.appendChild(card_img);
}

for (var i = 0; i < 32; i += 1) {
	const card_img = document.createElement("img");
	card_img.setAttribute("class", "card");
	card_img.setAttribute("id", "back" + i);
	card_img.setAttribute("src", "images/back.png");
	card_img.setAttribute("width", "169");
	card_img.setAttribute("height", "245");
	div_area.appendChild(card_img);
}

var curr_contract = new Contract(0,0,"");
var curr_hand = [];
var play_history = {
	bids: [],
	coinches: [],
	cards: [],
	belotes: []
}; 
var n_passes = -1;
var curr_trick = [];
var hands_size = [8,8,8,8];
var trick_starter = 0;
var curr_player = 0;
const player_pos = 0;

socket.onAny((eventName, args) => {
	console.log(eventName, args);
});

function launchGame() {
	document.getElementById('launchGame').style.visibility = "hidden";
	document.getElementById("results").style.visibility = "hidden";
	curr_contract = new Contract(0,0,"");
	curr_hand = [];
	play_history = {
		bids: [],
		coinches: [],
		cards: [],
		belotes: []
	}; 
	n_passes = -1;
	curr_trick = [];
	hands_size = [8,8,8,8];
	trick_starter = 0;
	curr_player = 0;
	socket.emit('launch game');
}

function sendPing() {
	socket.emit('ping');
}

socket.on('hand', (hand, dealer) => {
	//document.getElementById("test").innerHTML = hand;
	curr_hand = hand;
	curr_player = (dealer+1)%4;
	trick_starter = (dealer+1)%4;
	draw_bids(play_history);
	draw_state(curr_hand, curr_trick, player_pos, trick_starter, 0, "all trump");
	draw_bid_interface({bidder: -1, points: 0, trump: ""}, curr_player);
});

socket.on('bid accepted', (contract) => {
	if (contract.points === 0) {
		n_passes += 1;
	} else {
		n_passes = 0;
		curr_contract = contract;
	}
	curr_player = (curr_player+1)%4;
	play_history.bids.push(contract);
	draw_bids(play_history);
	draw_bid_interface(curr_contract, curr_player);
	draw_bubble_bid(contract);
});
socket.on('coinche accepted', (player) => {
	play_history.coinches.push(player);
	draw_bids(play_history);
	draw_bid_interface(curr_contract, curr_player);
});
socket.on('surcoinche accepted', (player) => {
	play_history.coinches.push(player);
	draw_bids(play_history);
});

socket.on('contract', (contract) => {
	curr_contract = contract;
	curr_player = trick_starter;
	draw_state(curr_hand, [], player_pos, trick_starter, trick_starter, curr_contract.trump);
	document.getElementById('bid_interface').style.visibility = "hidden";
	document.getElementById('coinche_interface').style.visibility = "hidden";
	document.getElementById('surcoinche_interface').style.visibility = "hidden";
	for (let i = 0; i < 4; i += 1) {
		document.getElementById('textp'+i.toString()).style.visibility = "hidden";
	}
});

socket.on('card accepted', (card_play, next_player) => {
	let card_id = card_play[0];
	let player = card_play[1];
	let belote = card_play[2];
	play_history.cards.push(belote_deck.cards.get(card_id));
	if (belote === "belote" || belote === "rebelote") {
		play_history.belotes.push(card_id);
	}
	hands_size[player] -= 1;
	curr_trick.push(card_id);
	if (player === player_pos) {
		let index = curr_hand.indexOf(card_id);
		curr_hand.splice(index, 1);
	}
	draw_state(curr_hand, curr_trick, player_pos, trick_starter, next_player, curr_contract.trump);
	if (curr_trick.length === 4) {
		curr_trick = [];
		trick_starter = next_player;
	}
	curr_player = next_player
});

socket.on('end play', (total, win) => {
	draw_end_game(total, win);
});

function draw_bid_interface(contract, curr_player) {
	var form = document.getElementById('bid_interface');
	if (curr_player === player_pos & n_passes != 3) {
		form.style.visibility = "visible";
	} else {
		form.style.visibility = "hidden";
	}
	var coinche_itf = document.getElementById('coinche_interface');
	if (play_history.coinches.length === 0 & ((contract.bidder + player_pos) % 2)
			& contract.points != 0) {
		coinche_itf.style.visibility = "visible";
	} else {
		coinche_itf.style.visibility = "hidden";
	}
	var surcoinche_itf = document.getElementById('surcoinche_interface');
	if (play_history.coinches.length === 1 & !((contract.bidder + player_pos) % 2)) {
		surcoinche_itf.style.visibility = "visible";
	} else {
		surcoinche_itf.style.visibility = "hidden";
	}
}

function draw_bubble_bid(contract) {
	let pos_bidder = (((contract.bidder - player_pos) % 4) + 4) % 4;
	let message = "passe";
	if (contract.points != 0) {
		if (contract.points != 250) {
			message	= contract.points.toString() + " " + to_fr(contract.trump);
		} else {
			message	= "Capot " + to_fr(contract.trump);
		}
	}
	for (let i = 0; i < 4; i += 1) {
		let bubble = document.getElementById("textp"+i.toString());
		if (i === pos_bidder) {
			bubble.innerHTML = message;
			bubble.style.visibility = "visible";
		} else {
			bubble.innerHTML = "";
			bubble.style.visibility = "hidden";
		}
	}
}

function draw_bids(game_history) {
	let table = document.getElementById("bid_history");
	table.innerHTML = "<tr><th>Joueur</th><th>Points</th><th>Atout</th></tr>";
	for (contract of game_history.bids) {
		if (contract.points != 0) {
			let new_row = table.insertRow(-1);
			let cell0 = new_row.insertCell(0);
			let cell1 = new_row.insertCell(1);
			let cell2 = new_row.insertCell(2);
			cell0.innerHTML = contract.bidder;
			cell1.innerHTML = contract.points;
			cell2.innerHTML = to_fr(contract.trump);
			if (contract.points === 250) {
				cell1.innerHTML = "Capot";
			}
		}
	}
	let n_coinche = false;
	for (coinche of game_history.coinches) {
		let new_row = table.insertRow(-1);
		let cell0 = new_row.insertCell(0);
		let cell1 = new_row.insertCell(1);
		let cell2 = new_row.insertCell(2);
		cell0.innerHTML = coinche;
		cell2.innerHTML = "";
		if (!n_coinche) {
			cell1.innerHTML = "Coinché";
		} else {
			cell1.innerHTML = "Surcoinché";
		}
	}
}

function draw_state(hand, trick, player, trick_starter, next_player, trump) {
	let i = 0;
	let cards_ok = [];
	if (next_player === player_pos) {
		let trick_cards = []
		if (trick.length < 4) {
			trick_cards = trick.map(card_id => belote_deck.cards.get(card_id));
		}
		cards_ok = allowed_cards(trick_cards, trump, hand.map(card_id => belote_deck.cards.get(card_id)));
		cards_ok = cards_ok.map(card => card.id);
	}
	for (let card_id of belote_deck.cards.keys()) {
		document.getElementById(card_id).style.visibility = "hidden";
		document.getElementById(card_id).onclick = "";
		document.getElementById(card_id).style.filter = "brightness(100%)";
		if (hand.includes(card_id)) {
			document.getElementById(card_id).style.visibility = "visible";
			document.getElementById(card_id).style.left = (100+200*i) + "px";
			document.getElementById(card_id).style.top = "700px";
			document.getElementById(card_id).style.zIndex = i.toString();
			if (next_player === player_pos) {
				document.getElementById(card_id).onclick = (e) => {play_card(e.target.id)};
				if (!cards_ok.includes(card_id)) {
					document.getElementById(card_id).style.filter = "brightness(50%)";
				} else {
					//document.getElementById(card_id).onclick = (e) => {play_card(e.target.id)};
				}
			}
			i += 1;
		}
	}
	let j = 0;
	for (let card_id of trick) {
		document.getElementById(card_id).style.visibility = "visible";
		document.getElementById(card_id).style.zIndex = j.toString();
		if ((trick_starter+j)%4 === 0) {
			document.getElementById(card_id).style.left = "650px";
			document.getElementById(card_id).style.top = "400px";
		} else if ((trick_starter+j)%4 === 1) {
			document.getElementById(card_id).style.left = "450px";
			document.getElementById(card_id).style.top = "350px";
		} else if ((trick_starter+j)%4 === 2) {
			document.getElementById(card_id).style.left = "650px";
			document.getElementById(card_id).style.top = "300px";
		} else {
			document.getElementById(card_id).style.left = "850px";
			document.getElementById(card_id).style.top = "350px";
		}
		j += 1;
	}
	for (let i = 0; i < 32; i += 1) {
		let back_id = "back" + i
		document.getElementById(back_id).style.visibility = "hidden";
	}
	let n = 0;
	let p = 0;
	for (let k = (player+1)%4; k != player; k = (k+1)%4) {
		for (let m = 0; m < hands_size[k]; m += 1) {
			let back_id = "back" + n;
			document.getElementById(back_id).style.visibility = "visible";
			document.getElementById(back_id).style.zIndex = n.toString();
			document.getElementById(back_id).style.transform = "rotate("+90*(p+1)+"deg)";
			if (p === 0) {
				document.getElementById(back_id).style.left = "100px";
				document.getElementById(back_id).style.top = (100+50*m) + "px";
			} else if (p === 1) {
				document.getElementById(back_id).style.left = (500+50*m) + "px";
				document.getElementById(back_id).style.top = "50px";
			} else if (p === 2) {
				document.getElementById(back_id).style.left = "1200px";
				document.getElementById(back_id).style.top = (100+50*m) + "px";
			} 
			n += 1;
		}
		p += 1;
	}
}

function draw_end_game(total, win) {
	for (let card_id of belote_deck.cards.keys()) {
		document.getElementById(card_id).style.visibility = "hidden";
		document.getElementById(card_id).onclick = "";
		document.getElementById(card_id).style.filter = "brightness(100%)";
	}
	for (let i = 0; i < 32; i += 1) {
		let back_id = "back" + i
		document.getElementById(back_id).style.visibility = "hidden";
	}
	let res = "";
	if (win) {
		if (!(curr_contract.bidder + player_pos) % 2) {
			res = "Partie gagnée !<br>Votre contrat est fait.<br>";
		} else {
			res = "Partie perdue !<br>Le contrat ennemi est fait.<br>";
		}
	} else {
		if (!(curr_contract.bidder + player_pos) % 2) {
			res = "Partie perdue !<br>Votre contrat est chu.<br>";
		} else {
			res = "Partie gagnée !<br>Le contrat ennemi est chu.<br>";
		}
	}
	res += "Points demandés : " + curr_contract.points + "<br>";
	res += "Points faits : " + total;
	document.getElementById("results").innerHTML = res;
	document.getElementById("results").style.visibility = "visible";
	document.getElementById('launchGame').style.visibility = "visible";
}

function play_card(card_id) {
	//document.getElementById("test2").innerHTML = card_id;
	socket.emit('card played', [card_id, player_pos, ""]);
}

function send_bid() {
	bid_points = document.getElementById('bid_itf_points').value;
	bid_trump = document.getElementById('bid_itf_trump').value;
	socket.emit('bid', {bidder: player_pos, points: parseInt(bid_points), trump: bid_trump});
}

function send_pass() {
	socket.emit('bid', {bidder: player_pos, points: 0, trump: ""});
}

function send_coinche() {
	socket.emit('coinche', player_pos);
}

function send_surcoinche() {
	socket.emit('coinche', player_pos);
}

function to_fr(trump) {
	let ans = "";
	if (trump === 'spades') {
		ans = 'Pique';
	} else if (trump === 'hearts') {
		ans = 'Coeur';
	} else if (trump === 'clubs') {
		ans = 'Trèfle';
	} else if (trump === 'diamonds') {
		ans = 'Carreau';
	} else if (trump === 'no trump') {
		ans = 'Sans atout';
	} else if (trump === 'all trump') {
		ans = 'Tout atout';
	}
	return ans;
}