var socket = io();

div_area = document.getElementById("play_area");
for (let card_id of belote_deck.cards.keys()) {
	let card_img = document.createElement("img");
	card_img.setAttribute("class", "card");
	card_img.setAttribute("id", card_id);
	card_img.setAttribute("alt", card_id);
	card_img.setAttribute("src", "images/" + card_id + ".png");
	card_img.setAttribute("width", "169px");
	card_img.setAttribute("height", "245px");
	div_area.appendChild(card_img);
}

for (let i = 0; i < 32; i += 1) {
	let card_img = document.createElement("img");
	card_img.setAttribute("class", "card");
	card_img.setAttribute("id", "back" + i.toString());
	card_img.setAttribute("src", "images/back.png");
	card_img.setAttribute("width", "169px");
	card_img.setAttribute("height", "245px");
	div_area.appendChild(card_img);
}

var curr_contract = new Contract(0,0,"");
var all_AI = false;
var curr_hand = [];
var curr_hands = [[],[],[],[]];
var play_history = {
	bids: [],
	coinches: [],
	cards: [],
	belotes: []
}; 
var n_passes = -1;
var curr_trick = [];
var hands_size = [8,8,8,8];
var curr_opener = 0;
var curr_player = 0;
var player_pos = 0;

document.getElementById('launch_interface').style.visibility = "visible";

socket.onAny((eventName, args) => {
	console.log(eventName, args);
});

function launchGame() {
	let n_player = parseInt(document.getElementById('n_player_choice').value);
	document.getElementById('launch_interface').style.visibility = "hidden";
	document.getElementById("results").style.visibility = "hidden";
	curr_contract = new Contract(0,0,"");
	curr_hand = [];
	curr_hands = [[],[],[],[]];
	play_history = {
		bids: [],
		coinches: [],
		cards: [],
		belotes: []
	}; 
	n_passes = -1;
	curr_trick = [];
	hands_size = [8,8,8,8];
	curr_opener = 0;
	curr_player = 0;
	socket.emit('launch game', n_player);
}

function sendPing() {
	socket.emit('ping');
}

socket.on('hand', (hand, dealer) => {
	//document.getElementById("test").innerHTML = hand;
	all_AI = false;
	curr_hand = hand;
	curr_player = (dealer+1)%4;
	curr_opener = (dealer+1)%4;
	draw_bids(play_history);
	draw_hands(curr_hand);
	draw_bid_interface({bidder: -1, points: 0, trump: ""}, curr_player);
});

socket.on('hands', (hands, dealer) => {
	player_pos = 0;
	all_AI = true;
	curr_hands = hands;
	curr_player = (dealer+1)%4;
	curr_opener = (dealer+1)%4;
	draw_bids(play_history);
	draw_all_hands(curr_hands);
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
	if (!all_AI) {
		draw_bid_interface(curr_contract, curr_player);
	}
	draw_bubble_bid(contract);
});
socket.on('coinche accepted', (player) => {
	play_history.coinches.push(player);
	draw_bids(play_history);
});
socket.on('surcoinche accepted', (player) => {
	play_history.coinches.push(player);
	draw_bids(play_history);
});

socket.on('contract', (contract) => {
	curr_contract = contract;
	curr_player = curr_opener;
	if (!all_AI) {
		draw_state(curr_hand, [], curr_opener, curr_opener, curr_contract.trump);
	} else {
		draw_state_all_AI(curr_hands, [], curr_opener, curr_opener, curr_contract.trump);
	}
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
		let pos_talker = (((player - player_pos) % 4) + 4) % 4;
		let bubble = document.getElementById("textp"+pos_talker.toString());
		bubble.innerHTML = belote;
		bubble.style.visibility = "visible";
		setTimeout(() => {bubble.style.visibility = "hidden";}, 5000);
	}
	hands_size[player] -= 1;
	curr_trick.push(card_id);
	if (!all_AI) {
		if (player === player_pos) {
			let index = curr_hand.indexOf(card_id);
			curr_hand.splice(index, 1);
		}
	} else {
		let index = curr_hands[player].indexOf(card_id);
		curr_hands[player].splice(index, 1);
	}
	curr_player = next_player;
	let trick_before = curr_trick;
	if (curr_trick.length === 4) {
		curr_trick = [];
	}
	if (!all_AI) {
		draw_state(curr_hand, trick_before, curr_opener, curr_player, curr_contract.trump);
	} else {
		draw_state_all_AI(curr_hands, trick_before, curr_opener, curr_player, curr_contract.trump);
	}
	if (trick_before.length === 4) {
		curr_opener = next_player;
	}
});

socket.on('end play', (total, win, tricks_taken) => {
	draw_end_game(total, win, tricks_taken);
});

socket.on('cancel play', () => {
	draw_cancel_game();
});

function draw_bid_interface(contract, player) {
	var form = document.getElementById('bid_interface');
	if (player === player_pos & n_passes != 3) {
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

function draw_state(hand, trick, trick_opener, next_player, trump) {
	let cards_ok = [];
	if (next_player === player_pos) {
		let trick_cards = []
		if (trick.length < 4) {
			trick_cards = trick.map(card_id => belote_deck.cards.get(card_id));
		}
		cards_ok = allowed_cards(trick_cards, trump, hand.map(card_id => belote_deck.cards.get(card_id)));
		cards_ok = cards_ok.map(card => card.id);
	}
	for (let q = 0; q < 8; q += 1) {
		let overlay_id = "belote_overlay_" + q.toString();
		document.getElementById(overlay_id).style.visibility = "hidden";
		document.getElementById(overlay_id).onclick = "";
	}
	let i = 0;
	let r = 0;
	for (let card_id of belote_deck.cards.keys()) {
		let card_elem = document.getElementById(card_id);
		card_elem.style.visibility = "hidden";
		card_elem.onclick = "";
		card_elem.style.filter = "brightness(100%)";
		card_elem.style.boxShadow = "";
		if (hand.includes(card_id)) {
			let card_pos_left = (100+200*i).toString() + "px";
			let card_pos_top = "700px"
			card_elem.style.visibility = "visible";
			card_elem.style.left = card_pos_left;
			card_elem.style.top = card_pos_top;
			card_elem.style.zIndex = i.toString();
			if (next_player === player_pos) {
				card_elem.onclick = (e) => {play_card(e.target.id)};
				if (!cards_ok.includes(card_id)) {
					card_elem.style.filter = "brightness(50%)";
				} else {
					card_elem.style.boxShadow = "0 0 10px #88FF88";
					let in_bidder_team = (player_pos%2 === curr_contract.bidder%2);
					let bel_itf = belote_possible(hand, card_id, in_bidder_team, trump, trick, play_history);
					let overlay_id = "belote_overlay_" + r.toString();
					let overlay_elem = document.getElementById(overlay_id)
					if (bel_itf === "belote") {
						overlay_elem.style.visibility = "visible";
						overlay_elem.onclick = () => {play_card_belote(card_id, bel_itf);};
						overlay_elem.innerHTML = "Belote ?";
						overlay_elem.style.left = card_pos_left;
						overlay_elem.style.top = card_pos_top;
						overlay_elem.style.zIndex = (i+1).toString();
						r += 1;
					} else if (bel_itf === "rebelote") {
						overlay_elem.style.visibility = "visible";
						overlay_elem.onclick = () => {play_card_belote(card_id, bel_itf);};
						overlay_elem.innerHTML = "Rebelote ?";
						overlay_elem.style.left = card_pos_left;
						overlay_elem.style.top = card_pos_top;
						overlay_elem.style.zIndex = (i+1).toString();
						r += 1;
					}
				}
			}
			i += 1;
		}
	}
	let j = 0;
	for (let card_id of trick) {
		let card_elem = document.getElementById(card_id);
		card_elem.style.visibility = "visible";
		card_elem.style.zIndex = j.toString();
		if ((trick_opener+j)%4 === 0) {
			card_elem.style.left = "650px";
			card_elem.style.top = "400px";
		} else if ((trick_opener+j)%4 === 1) {
			card_elem.style.left = "450px";
			card_elem.style.top = "350px";
		} else if ((trick_opener+j)%4 === 2) {
			card_elem.style.left = "650px";
			card_elem.style.top = "300px";
		} else {
			card_elem.style.left = "850px";
			card_elem.style.top = "350px";
		}
		j += 1;
	}
	for (let i = 0; i < 32; i += 1) {
		let back_id = "back" + i
		document.getElementById(back_id).style.visibility = "hidden";
		document.getElementById(back_id).style.boxShadow = "";
	}
	let n = 0;
	let p = 0;
	for (let k = (player_pos+1)%4; k != player_pos; k = (k+1)%4) {
		for (let m = 0; m < hands_size[k]; m += 1) {
			let back_id = "back" + n;
			let back_elem = document.getElementById(back_id);
			back_elem.style.visibility = "visible";
			back_elem.style.zIndex = n.toString();
			back_elem.style.transform = "rotate("+90*(p+1)+"deg)";
			if (p === 0) {
				back_elem.style.left = "100px";
				back_elem.style.top = (100+50*m) + "px";
			} else if (p === 1) {
				back_elem.style.left = (500+50*m) + "px";
				back_elem.style.top = "50px";
			} else if (p === 2) {
				back_elem.style.left = "1200px";
				back_elem.style.top = (100+50*m) + "px";
			} 
			if (k === next_player) {
				back_elem.style.boxShadow = "0 0 10px #88FF88";
			}
			n += 1;
		}
		p += 1;
	}
}

function draw_state_all_AI(hands, trick, trick_opener, next_player, trump) {
	let cards_ok = [];
	let trick_cards = []
	if (trick.length < 4) {
		trick_cards = trick.map(card_id => belote_deck.cards.get(card_id));
	}
	cards_ok = allowed_cards(trick_cards, trump, hands[next_player].map(card_id => belote_deck.cards.get(card_id)));
	cards_ok = cards_ok.map(card => card.id);
	
	let i = [0,0,0,0];
	for (let card_id of belote_deck.cards.keys()) {
		let card_elem = document.getElementById(card_id);
		card_elem.style.visibility = "hidden";
		card_elem.onclick = "";
		card_elem.style.filter = "brightness(100%)";
		card_elem.style.boxShadow = "";
		for (let k = 0; k < 4; k = k+1) {
			if (hands[k].includes(card_id)) {
				if (k === 0) {
					card_elem.style.left = (100+200*i[k]).toString() + "px";
					card_elem.style.top = "700px";
				} else if (k === 1) {
					card_elem.style.left = "100px";
					card_elem.style.top = (100+50*i[k]) + "px";
				} else if (k === 2) {
					card_elem.style.left = (500+50*i[k]) + "px";
					card_elem.style.top = "50px";
				} else {
					card_elem.style.left = "1200px";
					card_elem.style.top = (100+50*i[k]) + "px";
				}
				card_elem.style.transform = "rotate("+(90*k)+"deg)";
				card_elem.style.zIndex = i[k].toString();
				card_elem.style.visibility = "visible";
				if (next_player === k) {
					if (!cards_ok.includes(card_id)) {
						card_elem.style.filter = "brightness(50%)";
					} else {
						card_elem.style.boxShadow = "0 0 10px #88FF88";
					}
				}
				i[k] += 1;
			}
		}
	}
	let j = 0;
	for (let card_id of trick) {
		let card_elem = document.getElementById(card_id);
		card_elem.style.transform = "";
		if ((trick_opener+j)%4 === 0) {
			card_elem.style.left = "650px";
			card_elem.style.top = "400px";
		} else if ((trick_opener+j)%4 === 1) {
			card_elem.style.left = "450px";
			card_elem.style.top = "350px";
		} else if ((trick_opener+j)%4 === 2) {
			card_elem.style.left = "650px";
			card_elem.style.top = "300px";
		} else {
			card_elem.style.left = "850px";
			card_elem.style.top = "350px";
		}
		card_elem.style.visibility = "visible";
		card_elem.style.zIndex = j.toString();
		j += 1;
	}
}

function draw_hands(hand) {
	let i = 0;
	for (let card_id of belote_deck.cards.keys()) {
		if (hand.includes(card_id)) {
			let card_elem = document.getElementById(card_id);
			let card_pos_left = (100+200*i).toString() + "px";
			let card_pos_top = "700px"
			card_elem.style.visibility = "visible";
			card_elem.style.left = card_pos_left;
			card_elem.style.top = card_pos_top;
			card_elem.style.zIndex = i.toString();
			i += 1;
		}
	}
	let n = 0;
	let p = 0;
	for (let k = (player_pos+1)%4; k != player_pos; k = (k+1)%4) {
		for (let m = 0; m < hands_size[k]; m += 1) {
			let back_id = "back" + n;
			let back_elem = document.getElementById(back_id);
			back_elem.style.visibility = "visible";
			back_elem.style.zIndex = n.toString();
			back_elem.style.transform = "rotate("+90*(p+1)+"deg)";
			if (p === 0) {
				back_elem.style.left = "100px";
				back_elem.style.top = (100+50*m) + "px";
			} else if (p === 1) {
				back_elem.style.left = (500+50*m) + "px";
				back_elem.style.top = "50px";
			} else if (p === 2) {
				back_elem.style.left = "1200px";
				back_elem.style.top = (100+50*m) + "px";
			}
			n += 1;
		}
		p += 1;
	}
}

function draw_all_hands(hands) {
	let i = 0;
	for (let k = 0; k < 4; k = k+1) {
		i = 0;
		for (let card_id of belote_deck.cards.keys()) {
			if (hands[k].includes(card_id)) {
				let card_elem = document.getElementById(card_id);
				if (k === 0) {
					card_elem.style.left = (100+200*i).toString() + "px";
					card_elem.style.top = "700px";
				} else if (k === 1) {
					card_elem.style.left = "100px";
					card_elem.style.top = (100+50*i) + "px";
				} else if (k === 2) {
					card_elem.style.left = (500+50*i) + "px";
					card_elem.style.top = "50px";
				} else {
					card_elem.style.left = "1200px";
					card_elem.style.top = (100+50*i) + "px";
				}
				card_elem.style.transform = "rotate("+(90*k)+"deg)";
				card_elem.style.zIndex = i.toString();
				card_elem.style.visibility = "visible";
				i += 1;
			}
		}
	}
}

function draw_end_game(total, win, tricks_taken) {
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
	let bidder_in_team = (curr_contract.bidder%2 === player_pos%2);
	if (!all_AI) {
		if (bidder_in_team) {
			if (win) {
				res = "Partie gagnée !<br>Votre contrat est fait.<br>";
			} else {
				res = "Partie perdue !<br>Votre contrat est chu.<br>";
			}
		} else {
			if (win) {
				res = "Partie perdue !<br>Le contrat ennemi est fait.<br>";
			} else {
				res = "Partie gagnée !<br>Le contrat ennemi est chu.<br>";
			}
		}
	} else {
		if (win) {
			res = "Le contrat de l'équipe " + (curr_contract.bidder%2) + " est fait.<br>";
		} else {
			res = "Le contrat de l'équipe " + (curr_contract.bidder%2) + " est chu.<br>";
		}
	}
	if (curr_contract.points != 250) {
		res += "Points demandés : " + curr_contract.points + "<br>";
		res += "Points faits : " + total;
	} else {
		res += "Plis demandés : 8<br>";
		res += "Plis faits : " + tricks_taken;
	}
	document.getElementById("results").innerHTML = res;
	document.getElementById("results").style.visibility = "visible";
	document.getElementById('launch_interface').style.visibility = "visible";
}

function draw_cancel_game() {
	for (let card_id of belote_deck.cards.keys()) {
		document.getElementById(card_id).style.visibility = "hidden";
		document.getElementById(card_id).onclick = "";
		document.getElementById(card_id).style.filter = "brightness(100%)";
	}
	for (let i = 0; i < 32; i += 1) {
		let back_id = "back" + i
		document.getElementById(back_id).style.visibility = "hidden";
	}
	for (let i = 0; i < 4; i += 1) {
		let bubble = document.getElementById("textp"+i.toString());
		bubble.innerHTML = "";
		bubble.style.visibility = "hidden";
	}
	let res = "Partie annulée.<br>Tout le monde a passé.";
	document.getElementById("results").innerHTML = res;
	document.getElementById("results").style.visibility = "visible";
	document.getElementById('launch_interface').style.visibility = "visible";
}

function play_card(card_id) {
	socket.emit('card played', [card_id, player_pos, ""]);
}

function play_card_belote(card_id, belote) {
	socket.emit('card played', [card_id, player_pos, belote]);
}

function send_bid() {
	let bid_points = document.getElementById('bid_itf_points').value;
	let bid_trump = document.getElementById('bid_itf_trump').value;
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