import random


class Partie:
    # TODO: WIP
    def __init__(self, joueurs: list[str]):
        self.joueurs = joueurs
        self.manche = []
        self.score = [0,0]

    def lancer_partie(self):
        pass


class Jeu:
    # TODO: WIP
    def __init(self, couleurs: list[str], valeurs: list[str]):
        self.cartes = {couleur: {valeur: Carte(valeur,couleur) for valeur in valeurs}
                       for couleur in couleurs}
        self.jeu = []
        for couleur in couleurs:
            for valeur in valeurs:
                self.jeu += [self.cartes[couleur][valeur]]

    def melange(self):
        return random.sample(self.jeu, 32)


class Carte:
    def __init__(self, valeur: str, couleur: str):
        self.valeur = valeur
        self.couleur = couleur


class Annonce:
    def __init__(self, couleur: str, contrat: int):
        self.couleur = couleur
        self.contrat = contrat


couleurs = ['Pique', 'Coeur', 'Carreau', 'Trefle']
annonces_possibles = ['Pique', 'Coeur', 'Carreau', 'Trefle', 'Sans atout', 'Tout atout']
valeurs = ['7', '8', '9', '10', 'Valet', 'Dame', 'Roi', 'As']
cartes = {couleur: {valeur: Carte(valeur,couleur) for valeur in valeurs}
          for couleur in couleurs}
jeu = []
for couleur in couleurs:
    for valeur in valeurs:
        jeu += [cartes[couleur][valeur]]
val_atout = {'7': 0,
             '8': 1,
             'Dame': 2,
             'Roi': 3,
             '10': 4,
             'As': 5,
             '9': 6,
             'Valet': 7}
val_pas_atout = {'7': 0,
                 '8': 1,
                 '9': 2,
                 'Valet': 3,
                 'Dame': 4,
                 'Roi': 5,
                 '10': 6,
                 'As': 7}
points_atout = {'7': 0,
                '8': 0,
                'Dame': 3,
                'Roi': 4,
                '10': 10,
                'As': 11,
                '9': 14,
                'Valet': 20}
points_pas_atout = {'7': 0,
                    '8': 0,
                    '9': 0,
                    'Valet': 2,
                    'Dame': 3,
                    'Roi': 4,
                    '10': 10,
                    'As': 11}


def meilleur_atout(pli: list[Carte], atout: str) -> tuple[int, int]:
    vainqueur = -1
    meilleure_val = -1
    for ind, carte in enumerate(pli):
        if carte.couleur == atout:
            val_carte = val_atout[carte.valeur]
            if val_carte > meilleure_val:
                vainqueur = ind
                meilleure_val = val_carte
    return vainqueur, meilleure_val


def meilleure_couleur(pli: list[Carte]) -> tuple[int, int]:
    couleur_demandee = pli[0].couleur
    vainqueur = 0
    meilleure_val = val_pas_atout[pli[0].valeur]
    for ind, carte in enumerate(pli[1:]):
        if carte.couleur == couleur_demandee:
            val_carte = val_pas_atout[carte.valeur]
            if val_carte > meilleure_val:
                vainqueur = ind+1
                meilleure_val = val_carte
    return vainqueur, meilleure_val
                

def qui_prend_pli(pli: list[Carte], atout: str, lanceur: int) -> int:
    couleurs_jouees = {carte.couleur for carte in pli}
    if atout in couleurs_jouees:
        vainqueur, _ = meilleur_atout(pli, atout)
    elif atout == 'Tout atout':
        vainqueur, _ = meilleur_atout(pli, pli[0].couleur)
    else:
        vainqueur, _ = meilleure_couleur(pli)
    return (vainqueur+lanceur) % 4


def cartes_posables(pli: list[Carte], atout: str, main: list[Carte])\
        -> list[Carte]:
    if not pli:
        return main
    couleurs_main = {carte.couleur for carte in main}
    couleur_demandee = pli[0].couleur
    if couleur_demandee in couleurs_main:
        cartes_ok = [carte for carte in main
                     if carte.couleur == couleur_demandee]
        if not(couleur_demandee == atout or atout == 'Tout atout'):
            return cartes_ok
        else:  # la couleur demandee est de l'atout
            _, meilleure_val = meilleur_atout(pli, couleur_demandee)
            atouts_autorises = [carte for carte in cartes_ok
                                if val_atout[carte.valeur] > meilleure_val]
            if atouts_autorises:
                return atouts_autorises
            else:
                return cartes_ok
    else:  # on n'a pas la couleur demandee en main
        if atout not in couleurs_main:
            return main
        else:  # on a des atouts
            if atout in {carte.couleur for carte in pli}:
                _, meilleure_val = meilleur_atout(pli, atout)
            else:  # aucun atout n'a ete joue dans le pli
                meilleure_val = -1
            pas_atout = [carte for carte in main if carte.couleur != atout]
            atouts = [carte for carte in main if carte.couleur == atout]
            atouts_autorises = [carte for carte in atouts
                                if val_atout[carte.valeur] > meilleure_val]
            if qui_prend_pli(pli, atout, 0) == len(pli)-2:
                # le partenaire a la main
                if pas_atout + atouts_autorises:
                    return pas_atout + atouts_autorises
                else:
                    return main
            else:  # le partenaire n'a pas la main
                if atouts_autorises:
                    return atouts_autorises
                else:
                    return atouts


def comptage_points(plis: list[Carte], atout: str, dix_de_der: bool,
                    belote: int) -> int:
    total = 0
    for carte in plis:
        if carte.couleur == atout or atout == 'Tout atout':
            total += points_atout[carte.valeur]
        else:
            total += points_pas_atout[carte.valeur]
    if atout == 'Tout atout':
        total = total*(19/31)
    elif atout == 'Sans atout':
        total = total*(19/15)
    if dix_de_der:
        total += 10
    if total >= 80:
        total += belote*20  # potentiellement plusieurs belotes a TA
    return total


def contrat_fait(annonce: Annonce, plis: list[Carte], dix_de_der: bool,
                 belote: int) -> bool:
    if annonce.contrat < 250:  # pas de capot
        points_fait = comptage_points(plis, annonce.couleur, dix_de_der,
                                      belote)
        return points_fait >= annonce.contrat
    else:  # capot
        return len(plis) == 32


def joue_manche(mains: list[list[Carte]], atout: str, donneur: int,
                histo_annonces: list[tuple[int,Annonce]],
                coinches: tuple[int, int, int])\
        -> tuple[list[Carte], bool, int,
                 list[list[tuple[int,list[Carte]]],list[Carte]]]:
    equipe_partie = histo_annonces[-1][0] % 2
    lanceur = (donneur+1) % 4
    historique = [[],[]]
    plis_equipe_partie = []
    dix_de_der = False
    belotes = 0
    for _ in range(8):
        pli = []
        for i in range(4):
            joueur = (lanceur+i) % 4
            preneur = joueur % 2 == equipe_partie
            carte_jouee, belote = choix_carte(pli, atout, mains[joueur],
                                              historique, preneur,
                                              histo_annonces, coinches)
            mains[joueur].pop(mains[joueur].index(carte_jouee))
            if belote == 'belote':
                historique[1] += [carte_jouee]
            elif belote == 'rebelote':
                belotes += 1
            pli += [carte_jouee]
        historique[0] += [(lanceur, pli)]
        lanceur = qui_prend_pli(pli, atout, lanceur)
        if lanceur % 2 == equipe_partie:
            plis_equipe_partie += pli
    if lanceur % 2 == equipe_partie:
        dix_de_der = True
    return plis_equipe_partie, dix_de_der, belotes, historique


def tour_annonces(mains: list[list[Carte]], donneur: int,
                  score: list[int,int])\
        -> tuple[list[tuple[int,Annonce]], tuple[int, int, int]]:
    qui_parle = (donneur + 1) % 4
    historique_annonces = []
    annonce, passe = choix_annonce(donneur, mains[qui_parle], score,
                                   historique_annonces, qui_parle)
    coinche = False
    qui_coinche = -1
    if not passe:
        historique_annonces += [(qui_parle, annonce)]
        for i in [1,3]:
            qui_coinche = (qui_parle + 1) % 4
            coinche = choix_coinche(donneur, mains[qui_coinche], score,
                                    historique_annonces, qui_coinche)
            if coinche:
                break
    n_passe = 0
    while n_passe < 3 and not coinche:
        qui_parle = (qui_parle + 1) % 4
        annonce, passe = choix_annonce(donneur, mains[qui_parle], score,
                                       historique_annonces, qui_parle)
        if not passe:
            n_passe = 0
            historique_annonces += [(qui_parle, annonce)]
            for i in [1, 3]:
                qui_coinche = (qui_parle + 1) % 4
                coinche = choix_coinche(donneur, mains[qui_coinche], score,
                                        historique_annonces, qui_coinche)
                if coinche:
                    break
        else:
            n_passe += 1
    qui_surcoinche = -1
    surcoinche = False
    if coinche:
        for i in [0, 2]:
            qui_surcoinche = (qui_parle + i) % 4
            surcoinche = choix_surcoinche(donneur, mains[qui_surcoinche],
                                          score, historique_annonces,
                                          qui_surcoinche)
            if surcoinche:
                break
    coinches = (coinche+surcoinche, qui_coinche, qui_surcoinche)
    return historique_annonces, coinches


def choix_carte(pli: list[Carte],
                atout: str, main: list[Carte],
                historique, preneur: bool,
                histo_annonces: list[tuple[int,Annonce]],
                coinches: tuple[int, int, int])\
        -> tuple[Carte, str]:
    cartes_possibles = cartes_posables(pli, atout, main)
    carte_jouee = random.choice(cartes_possibles)
    belote = ''
    if preneur and carte_jouee.couleur == atout:
        if (carte_jouee.valeur == 'Dame' and cartes[atout]['Roi'] in main or
                carte_jouee.valeur == 'Roi' and cartes[atout]['Dame'] in main):
            belote = 'belote'
        elif (carte_jouee.valeur == 'Dame' and cartes[atout]['Roi'] in historique[1] or
              carte_jouee.valeur == 'Roi' and cartes[atout]['Dame'] in historique[1]):
            belote = 'rebelote'
    elif preneur and atout == 'Tout atout':
        coul = carte_jouee.couleur
        if (carte_jouee.valeur == 'Dame' and cartes[coul]['Roi'] in main or
                carte_jouee.valeur == 'Roi' and cartes[coul]['Dame'] in main):
            if not pli or pli[0].couleur == coul:
                belote = 'belote'
        elif (carte_jouee.valeur == 'Dame' and cartes[coul]['Roi'] in historique[1] or
              carte_jouee.valeur == 'Roi' and cartes[coul]['Dame'] in historique[1]):
            if not pli or pli[0].couleur == coul:
                belote = 'rebelote'
    return carte_jouee, belote


def choix_annonce(donneur: int, main: list[Carte], score: list[int,int],
                  historique_annonces: list[tuple[int,Annonce]],
                  qui_parle: int) -> tuple[Annonce,bool]:
    if not historique_annonces:
        contrat_min = 80
    else:
        contrat_min = historique_annonces[-1][1].contrat + 10
    if contrat_min == 260:
        passe = True
        annonce = Annonce('NA',-1)
    else:
        prob_passe = int(((contrat_min - 70)/10)*2)
        passe = bool(random.randint(0,prob_passe))
        if not passe:
            coul = random.choice(annonces_possibles)
            surenchere = random.choice([0,10,20,30])
            contrat = contrat_min + surenchere
            if contrat > 180:
                contrat = 250
            passe = False
            annonce = Annonce(coul,contrat)
        else:
            passe = True
            annonce = Annonce('NA', -1)
    return annonce, passe


def choix_coinche(donneur, main, score, historique_annonces, qui_coinche)\
        -> bool:
    return random.randint(0,30) == 30


def choix_surcoinche(donneur, main, score, historique_annonces,
                     qui_surcoinche) -> bool:
    return random.randint(0,10) == 10

donneur = random.randint(0,3)
score = [0,0]
manches = []
while score[0] <= 1000 and score[1] <= 1000:
    histo_annonces = []
    while not histo_annonces:
        donneur = (donneur + 1) % 4
        jeu_melange = random.sample(jeu, 32)
        mains = [jeu_melange[0:8], jeu_melange[8:16],
                 jeu_melange[16:24], jeu_melange[24:32]]
        histo_annonces, coinches =\
            tour_annonces(mains, donneur, score)
    atout = histo_annonces[-1][1].couleur
    plis_equipe_partie, dix_de_der, belotes, historique =\
        joue_manche(mains, atout, donneur, histo_annonces, coinches)
    equipe_partie = histo_annonces[-1][0] % 2
    points_en_jeu = histo_annonces[-1][1].contrat*(coinches[0]+1)
    if contrat_fait(histo_annonces[-1][1], plis_equipe_partie,
                    dix_de_der, belotes):
        score[equipe_partie] += points_en_jeu
    else:
        score[(equipe_partie+1) % 2] += points_en_jeu
    manches += [(histo_annonces, historique)]
#   print(score)
