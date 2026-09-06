# Painlevé I — Surface Hamiltonienne $G(x,y,t)=0$ (Rouge) vs Séparatrice Réelle (Bleue)

**Auteurs :** Éric Olivier & John H. Hubbard (2026)  
**Dossier :** `WEB_VIEWER_HAMILTON`

---

## 1. Cadre Mathématique & Géométrique

Ce visualiseur 3D interactif explore l'espace des phases étendu $(x, y, t)$ de la première équation de Painlevé :
$$\ddot{x} = x^2 - t, \quad y = \dot{x}$$

### A. La Tasse de Hubbard et l'Entonnoir Captif
Dans leurs travaux fondateurs, John Hubbard et Beverly West introduisent la fonction d'énergie hamiltonienne :
$$G(x, y, t) = \frac{y^2}{2} - \frac{x}{3}\big(x^2 - 3t\big)$$

Le long de toute solution de Painlevé I, le bilan d'énergie exact vérifie :
$$\frac{\mathrm{d}G}{\mathrm{d}t} = x(t)$$

Pour $x \le 0$, on a donc $\frac{\mathrm{d}G}{\mathrm{d}t} \le 0$ :
- La région $B = \{ (x, y, t) \in \mathbb{R}^3 : G(x, y, t) \le 0, \; x \le 0, \; t \ge 0 \}$ forme un **entonnoir captif invariant par le flot futur** (*cup-shaped region* / *entering fence*).
- Toute trajectoire qui pénètre dans cette « tasse » ne peut plus jamais franchir sa frontière rouge et demeure globalement confinée sans pôle pour tout $t \ge t_0$.

### B. Objets Géométriques en Scène
1. **Nappe Réelle (Bleue)** : Surface séparatrice dynamique non-autonome issue de l'intégration certifiée haute précision de Painlevé I ($1 \le t \le 15$).
2. **Goutte Gelée Théorique (Rouge Rubis)** : Surface homocline du modèle autonome gelé de niveau critique $H(t, x, y) = \frac{2}{3}t^{3/2}$, s'appuyant sur l'arête des selles $(\sqrt{t}, 0, t)$ et s'étendant jusqu'au turning point $x = -2\sqrt{t}$.
3. **Nappe Hamiltonienne $G(x,y,t)=0$ (Ambre / Or)** :
   - **Tasse de Hubbard** ($x \le 0$) : clôture entrante certifiée de niveau d'énergie $E = 0$, s'étendant sur $x \in [-\sqrt{3t}, 0]$ avec sommet reposant sur $(0, 0, 0)$.
   - **Branche Extérieure** ($x \ge \sqrt{3t}$) : branche asymptotique non bornée.
4. **Ligne des Centres $(-\sqrt{t}, 0, t)$ (Rouge vif)** : Axe des minima du potentiel, logé au cœur oscillant de la tasse et de la goutte.
5. **Ligne des Selles $(\sqrt{t}, 0, t)$ (Noir technique)** : Lieu des points-selles instantanés de la dynamique gelée.
6. **Contours de section ($t_{\min} = 1$ et $t_{\max} = 15$)** : Tracés par défaut en noir technique pur et épaisseur minimale ($0{,}04$).
7. **Mode de rendu par défaut** : « Mixte » (surfaces transparentes + maillage filaire superposé) pour une perception 3D optimale des trois poupées russes emboîtées.
8. **Repère Cartésien $(x, y, t)$** noir issu de $(0,0,0)$ avec flèches volumiques 3D et boîte perspective graduée.
