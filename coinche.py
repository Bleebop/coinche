class Carte:
    def __init__(self, valeur, couleur):
        self.valeur = valeur
        self.couleur = couleur


couleurs = ['Pique', 'Coeur', 'Carreau', 'Trefle']
valeurs = ['7', '8', '9', '10', 'Valet', 'Dame', 'Roi', 'As']
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
    couleurs_jouees = [carte.couleur for carte in pli]
    if atout in couleurs_jouees:
        vainqueur, _ = meilleur_atout(pli, atout)
    else:
        vainqueur, _ = meilleure_couleur(pli)
    return (vainqueur+lanceur) % 4


def cartes_posables(pli: list[Carte], atout: str, main: list[Carte])\
        -> list[Carte]:  # TODO: fix on doit toujours monter a l'atout
    if not pli:
        return main
    couleurs_main = {carte.couleur for carte in main}
    couleur_demandee = pli[0].couleur
    if couleur_demandee not in couleurs_main:
        if atout not in couleurs_main:
            return main
        else:
            if qui_prend_pli(pli, atout, 0) == len(pli)-2:
                return main
            else:
                return [carte for carte in main if carte.couleur == atout]
    else:
        cartes_ok = [carte for carte in main
                     if carte.couleur == couleur_demandee]
        if couleur_demandee != atout:
            return cartes_ok
        else:
            _, meilleure_val = meilleur_atout(pli, atout,)
            return [carte for carte in cartes_ok
                    if val_atout[carte.valeur] > meilleure_val]


Pi7 = Carte('7','Pique')
Pi8 = Carte('8','Pique')
Pi9 = Carte('9','Pique')
Pi10 = Carte('10','Pique')
PiV = Carte('Valet','Pique')
PiD = Carte('Dame','Pique')
PiR = Carte('Roi','Pique')
PiA = Carte('As','Pique')
Co7 = Carte('7','Coeur')
Co8 = Carte('8','Coeur')
Co9 = Carte('9','Coeur')
Co10 = Carte('10','Coeur')
CoV = Carte('Valet','Coeur')
CoD = Carte('Dame','Coeur')
CoR = Carte('Roi','Coeur')
CoA = Carte('As','Coeur')
Ca7 = Carte('7','Carreau')
Ca8 = Carte('8','Carreau')
Ca9 = Carte('9','Carreau')
Ca10 = Carte('10','Carreau')
CaV = Carte('Valet','Carreau')
CaD = Carte('Dame','Carreau')
CaR = Carte('Roi','Carreau')
CaA = Carte('As','Carreau')
Tr7 = Carte('7','Trefle')
Tr8 = Carte('8','Trefle')
Tr9 = Carte('9','Trefle')
Tr10 = Carte('10','Trefle')
TrV = Carte('Valet','Trefle')
TrD = Carte('Dame','Trefle')
TrR = Carte('Roi','Trefle')
TrA = Carte('As','Trefle')

pli = [Carte('7','Pique'), Carte('9','Pique'),
        Carte('Roi','Coeur'), Carte('Roi','Pique')]
print(qui_prend_pli(pli, 'Carreau', 0))
