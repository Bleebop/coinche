import random

class Carte:
    def __init__(self, valeur: str, couleur: str):
        self.valeur = valeur
        self.couleur = couleur


class Annonce:
    def __init__(self, couleur: str, contrat: int):
        self.couleur = couleur
        self.contrat = contrat


couleurs = ['Pique', 'Coeur', 'Carreau', 'Trefle']
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
                equipe_partie: int) -> tuple[list[Carte], bool, int]:
    lanceur = (donneur+1) % 4
    historique = []
    plis_equipe_partie = []
    dix_de_der = False
    belotes = 0
    for _ in range(8):
        pli = []
        for i in range(4):
            joueur = (lanceur+i) % 4
            preneur = joueur % 2 == equipe_partie
            carte_jouee, belote = choix_carte(pli,atout,mains[joueur],
                                              historique, preneur)
            mains[joueur].pop(mains[joueur].index(carte_jouee))
            if belote == 'belote':
                historique += [carte_jouee]
            elif belote == 'rebelote':
                belotes += 1
            pli += [carte_jouee]
        lanceur = qui_prend_pli(pli, atout, lanceur)
        if lanceur % 2 == equipe_partie:
            plis_equipe_partie += pli
    if lanceur % 2 == equipe_partie:
        dix_de_der = True
    return plis_equipe_partie, dix_de_der, belotes


def choix_carte(pli: list[Carte], atout: str, main: list[Carte],
                historique, preneur: bool) -> tuple[Carte, str]:
    cartes_possibles = cartes_posables(pli, atout, main)
    carte_jouee = random.choice(cartes_possibles)
    belote = ''
    if preneur and carte_jouee.couleur == atout:
        if (carte_jouee.valeur == 'Dame' and cartes[atout]['Roi'] in main or
                carte_jouee.valeur == 'Roi' and cartes[atout]['Dame'] in main):
            belote = 'belote'
        elif (carte_jouee.valeur == 'Dame' and cartes[atout]['Roi'] in historique or
              carte_jouee.valeur == 'Roi' and cartes[atout]['Dame'] in historique):
            belote = 'rebelote'
    elif preneur and atout == 'Tout atout':
        coul = carte_jouee.couleur
        if (carte_jouee.valeur == 'Dame' and cartes[coul]['Roi'] in main or
                carte_jouee.valeur == 'Roi' and cartes[coul]['Dame'] in main):
            if not pli or pli[0].couleur == coul:
                belote = 'belote'
        elif (carte_jouee.valeur == 'Dame' and cartes[coul]['Roi'] in historique or
              carte_jouee.valeur == 'Roi' and cartes[coul]['Dame'] in historique):
            if not pli or pli[0].couleur == coul:
                belote = 'rebelote'
    return carte_jouee, belote


jeu_melange = random.sample(jeu, 32)
mains = [jeu_melange[0:8],jeu_melange[8:16],
         jeu_melange[16:24],jeu_melange[24:32]]
atout = random.choice(couleurs + ['Tout atout', 'Sans atout'])
donneur = random.randint(0,3)
equipe_partie = random.randint(0,1)
plis_equipe_partie, dix_de_der, belotes = joue_manche(mains, atout, donneur, equipe_partie)
points_faits = comptage_points(plis_equipe_partie, atout, dix_de_der, belotes)
print(points_faits)
