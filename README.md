# Painlevé I — Visualiseur 3D des Surfaces Séparatrices ($-3.5 \le t \le 15.0$)

**Application en ligne :** [https://quejaime.github.io/painleve1-hamilton/](https://quejaime.github.io/painleve1-hamilton/)  
**Auteurs :** Éric Olivier & John H. Hubbard (2026)  
**Projet :** `SEPARATRICE_PAINLEVE / WEB_VIEWER_HAMILTON`

---

## 1. Cadre Mathématique & Géométrique

Ce visualiseur 3D interactif explore l'espace des phases étendu $(x, y, t)$ de la première équation de Painlevé :
$$\ddot{x} = x^2 - t, \quad y = \dot{x}$$

### A. La Tasse de Hubbard et l'Entonnoir Captif
Dans leurs travaux fondateurs, John Hubbard et Beverly West introduisent la fonction d'énergie hamiltonienne gelée :
$$G(x, y, t) = \frac{y^2}{2} - \frac{x}{3}\big(x^2 - 3t\big)$$

Le long de toute trajectoire de Painlevé I, la dérivée temporelle exacte vérifie :
$$\frac{\mathrm{d}G}{\mathrm{d}t} = x(t)$$

Pour $x \le 0$, on a donc $\frac{\mathrm{d}G}{\mathrm{d}t} \le 0$ :
- La région $B = \{ (x, y, t) \in \mathbb{R}^3 : G(x, y, t) \le 0, \; x \le 0, \; t \ge 0 \}$ constitue un **entonnoir captif invariant par le flot futur** (*cup-shaped entering fence*).
- Toute solution qui pénètre dans cette « tasse » ne peut plus jamais franchir sa frontière d'énergie nulle et demeure globalement confinée sans pôle pour tout $t \ge t_0$.

### B. Les Trois Nappes en Scène

1. **Nappe Réelle Non-Autonome (Bleue, $-3.5 \le t \le 15.0$)** :
   - Surface séparatrice dynamique exacte issue de l'intégration numérique certifiée haute précision (algorithme prédiction-correction avec bisections dichotomiques 1D à tolérance machine $\sim 10^{-11}$).
   - Déployée sur 186 tranches régulières ($\Delta t = 0.10$), du régime oscillant aux grandes valeurs positives de $t$ jusqu'au régime polaire à $t = -3.50$.
   - À $t = -3.50$, elle capture rigoureusement le nez géométrique de la nappe en $(x, y) = (9.35, -24.58)$ juste avant le premier pôle double réel universel situé en $t_p \approx -4.112$.
   - Plancher spatial uniforme : les deux queues (intérieure et extérieure) s'achèvent rigoureusement sur le plan horizontal $y = -30.0000$ ($Z = 30.00$).

2. **Goutte Gelée Théorique de Boutroux (Rouge Rubis, $0 \le t \le 15.0$)** :
   - Surface séparatrice du modèle autonome gelé en coordonnées de Boutroux :
     $$v^2 = \frac{2}{3}u^2\big(u + 3\sqrt{t}\big), \quad x = u + \sqrt{t}, \quad y = v$$
   - Comprend la boucle homocline entourant le centre instantané $(-\sqrt{t}, 0, t)$ et la queue descendante instable issue du col hyperbolique $(\sqrt{t}, 0, t)$.
   - Extension dynamique adaptative : la queue s'étend exactement jusqu'au plancher $y = -30.0000$ sur toutes les sections.

3. **Nappe Hamiltonienne $G(x,y,t)=0$ (Ambre / Or, $0 \le t \le 15.0$)** :
   - **Tasse de Hubbard ($x \le 0$)** : barrière de confinement fermée d'énergie nulle, naissant en $(0,0,0)$ à la bifurcation $t = 0$.
   - **Branche Extérieure ($x \ge \sqrt{3t}$)** : nappe asymptotique non bornée, dont la branche inférieure descend exactement jusqu'au plancher $y = -30.0000$.

4. **Lignes Invariantes & Singularités** :
   - **Ligne des Centres** $(-\sqrt{t}, 0, t)$ en rouge vif.
   - **Ligne des Selles** $(\sqrt{t}, 0, t)$ en noir technique pur.
   - Toutes deux clampées rigoureusement au plafond de la boîte ($t = 15.00$).

5. **Contours de Section & Plans Remarquables** :
   - Sommet $t = 15.00$, base $t = -3.50$, et plan critique de flottaison / bifurcation $t = 0.00$.

---

## 2. Guide d'Utilisation du Visualiseur Web

- **Navigation 3D (OrbitControls)** :
  - **Clic gauche + glisser** : rotation orbitale 3D fluide.
  - **Clic droit + glisser** : translation panoramique (pan).
  - **Molette de défilement** : zoom avant / arrière continu.
- **Panneau de Contrôle Latéral** :
  - Activation / désactivation indépendante de chacune des couches 3D.
  - Réglage individuel de l'opacité par curseur glissant.
  - Bascule des modes de rendu : *Mixte* (surfaces translucides + maillage filaire), *Surfaces seules*, ou *Fil de fer seul*.
  - Raccourci clavier : touche **H** pour masquer / afficher l'interface.
  - Bouton **Capture HD** pour télécharger instantanément un cliché PNG sur fond blanc pur calibré pour l'insertion LaTeX.
