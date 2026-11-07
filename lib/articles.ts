export interface Article {
  slug: string;
  titre: string;
  categorie: string;
  extrait: string;
  contenu: string;
  date: string;
  readTime: string;
  imageUrl: string;
  imageAlt: string;
  ctaLabel: string;
  ctaHref: string;
}

const ARTICLES: Article[] = [
  {
    slug: "liquidation-de-stock-entreprise",
    titre: "Liquidation de stock : définition, étapes et solutions",
    categorie: "Guide vendeur",
    extrait:
      "Liquider un stock d'entreprise sans le brader : les options possibles, comment préparer vos lots, les erreurs à éviter et les règles à connaître.",
    date: "7 novembre 2026",
    readTime: "7 min",
    imageUrl: "https://www.quicklot.fr/blog/liquidation-stock.jpg",
    imageAlt: "Palettes de cartons prêtes à être vendues en lots dans un entrepôt",
    ctaLabel: "Vendez sur Quicklot",
    ctaHref: "/dashboard/listing/nouveau",
    contenu: `
<p>Un stock qui ne tourne plus coûte cher : il immobilise votre trésorerie, occupe de la place en entrepôt et perd de la valeur chaque mois. La liquidation de stock consiste à l'écouler rapidement, en acceptant un prix réduit, pour récupérer cette trésorerie. Bien menée, elle rapporte nettement plus qu'un rachat en bloc par le premier soldeur venu.</p>

<h2>Liquidation de stock : de quoi parle-t-on ?</h2>
<p>Ici, la liquidation de stock désigne la vente accélérée de tout ou partie de vos marchandises, à votre initiative : fin de série, arrêt d'une gamme, changement d'activité, surstock. Elle se distingue de deux situations proches :</p>
<ul>
<li><strong>La liquidation judiciaire :</strong> lorsqu'une entreprise est placée en liquidation judiciaire, ce n'est plus elle qui vend. Le liquidateur désigné par le tribunal organise la vente des actifs, souvent aux enchères.</li>
<li><strong>Le déstockage et le surplus :</strong> ce sont des excédents vendus sans urgence particulière. Nous détaillons les nuances dans l'article <a href="/blog/destockage-liquidation-surplus-differences">Déstockage, liquidation, surplus : quelles différences ?</a></li>
</ul>

<h2>Les options pour liquider un stock</h2>
<ul>
<li><strong>Le rachat en bloc par un soldeur :</strong> c'est la solution la plus rapide, car un seul acheteur reprend tout. C'est aussi la moins rémunératrice : le soldeur prend à sa charge le risque de revente et négocie en conséquence.</li>
<li><strong>La vente aux enchères :</strong> adaptée au matériel et aux lots hétérogènes, avec un prix final incertain et des frais de vente.</li>
<li><strong>La vente directe à des revendeurs professionnels :</strong> commerçants, revendeurs en ligne, vendeurs Amazon. Ils achètent pour revendre et raisonnent sur la valeur de revente de chaque produit. C'est souvent là que vous obtiendrez le meilleur prix, à condition de les trouver.</li>
<li><strong>Le don :</strong> pour ce qui ne trouve pas preneur, le don à une association reste possible et peut ouvrir droit à une réduction d'impôt au titre du mécénat. Vérifiez les conditions avec votre expert-comptable.</li>
</ul>

<h2>Liquider votre stock sur Quicklot, étape par étape</h2>
<p>Quicklot est une place de marché réservée aux professionnels : vous y publiez vos lots, et des acheteurs professionnels, notamment des vendeurs Amazon, les achètent en ligne.</p>
<ol>
<li><strong>Faites vérifier votre entreprise.</strong> Avant toute publication, une vérification KYC est demandée : nom de l'entreprise, numéro SIRET, TVA ou RCS, pièce d'identité du gérant et adresse. Les acheteurs savent ainsi à qui ils ont affaire.</li>
<li><strong>Publiez votre lot.</strong> Renseignez le titre, la description, la catégorie, le prix hors taxes, les photos et, si vous les avez, les codes EAN. Indiquez l'état (100 % neuf ou emballage abîmé) et vos options de livraison : enlèvement sur place, livraison en France ou en Belgique, préparation pour Amazon FBA.</li>
<li><strong>Expédiez la commande.</strong> L'acheteur paie en ligne par Stripe. Vous expédiez ensuite sous 5 jours ouvrés au maximum après la confirmation du paiement.</li>
<li><strong>Recevez votre paiement.</strong> Quicklot prélève une commission de 7,5 % HT sur le montant de la vente, hors frais de livraison. Le solde vous est reversé par Stripe Connect.</li>
</ol>

<h2>Comment valoriser un lot avant de le mettre en vente</h2>
<ul>
<li><strong>Faites un inventaire précis :</strong> références, quantités, état. Un acheteur paie mieux ce qu'il peut évaluer.</li>
<li><strong>Ajoutez les codes EAN :</strong> les vendeurs Amazon s'en servent pour retrouver chaque produit et calculer leur marge. Un lot sans EAN est plus long à évaluer, donc moins bien payé.</li>
<li><strong>Prenez de vraies photos :</strong> le lot entier, puis quelques produits en gros plan, emballage compris.</li>
<li><strong>Constituez des lots cohérents :</strong> plusieurs lots homogènes, par référence ou par gamme, trouvent plus facilement preneur qu'un lot fourre-tout.</li>
<li><strong>Fixez un prix réaliste :</strong> partez de la valeur de revente des produits plutôt que de votre prix d'achat. Votre acheteur doit pouvoir dégager une marge.</li>
</ul>

<h2>Les erreurs fréquentes</h2>
<ul>
<li><strong>Attendre trop longtemps :</strong> un produit saisonnier ou une référence remplacée perd de la valeur chaque mois.</li>
<li><strong>Décrire le lot de façon vague :</strong> un « lot divers » attire peu d'acheteurs et beaucoup de questions.</li>
<li><strong>Taire les défauts :</strong> un emballage abîmé ou un produit incomplet doit être signalé. Sur Quicklot, le vendeur garantit que son lot est conforme à sa description et à ses photos.</li>
<li><strong>Détruire ce qui ne se vend pas :</strong> en France, la loi AGEC interdit depuis 2022 de détruire la plupart des invendus non alimentaires neufs. Ils doivent être réemployés, donnés ou recyclés.</li>
</ul>

<h2>Questions fréquentes</h2>
<h3>Quelle différence entre liquidation de stock et liquidation judiciaire ?</h3>
<p>La liquidation de stock est une décision commerciale : vous choisissez de vendre vite une partie de vos marchandises. La liquidation judiciaire est une procédure collective prononcée par un tribunal : c'est alors le liquidateur qui vend les actifs de l'entreprise.</p>
<h3>Faut-il déclarer une liquidation de stock ?</h3>
<p>Annoncer au public une vente « en liquidation » en magasin est une vente réglementée en France : elle suppose une déclaration préalable en mairie (article L310-1 du Code de commerce). Pour une vente de lots à d'autres professionnels, faites le point avec votre expert-comptable.</p>
<h3>Combien coûte la vente d'un lot sur Quicklot ?</h3>
<p>Quicklot prélève une commission de 7,5 % HT sur le montant de chaque vente, hors frais de livraison. Les prix des lots sont saisis et affichés hors taxes, et la TVA est calculée automatiquement au paiement.</p>

<h2>En résumé</h2>
<p>Liquider un stock ne veut pas dire le brader. En préparant des lots précis, avec photos et codes EAN, et en les proposant directement à des revendeurs professionnels, vous récupérez votre trésorerie à un meilleur prix qu'en revendant tout en bloc.</p>
`,
  },
  {
    slug: "sourcer-produits-amazon-fba-destockage",
    titre: "Comment sourcer des produits Amazon FBA via le déstockage en gros",
    categorie: "Guide acheteur",
    extrait:
      "Découvrez comment les Amazon Sellers francophones utilisent le déstockage en gros pour sourcer des produits rentables en FBA, avec des marges nettes de 30 à 60 %.",
    date: "10 avril 2025",
    readTime: "6 min",
    imageUrl: "https://www.quicklot.fr/blog/sourcer-fba.jpg",
    imageAlt: "Sourcer des produits Amazon FBA via le déstockage",
    ctaLabel: "Découvrez les lots sur Quicklot",
    ctaHref: "/boutique",
    contenu: `
<p>Le déstockage en gros représente l'une des sources d'approvisionnement les plus rentables pour les vendeurs Amazon FBA francophones. Contrairement à l'arbitrage retail classique — qui exige de parcourir les rayons un par un — le déstockage permet d'acquérir des dizaines, voire des centaines d'unités d'un même produit à prix cassé, puis de les revendre sur Amazon avec des marges nettes de 30 à 60 %.</p>

<h2>Qu'est-ce que le déstockage en gros ?</h2>
<p>Le déstockage en gros désigne la vente de marchandises que leur propriétaire souhaite écouler rapidement : fin de série, surstocks saisonniers, changements de packaging ou fermetures de magasins. Ces produits sont neufs, en parfait état, mais vendus bien en dessous de leur prix catalogue — souvent entre 20 % et 50 % du prix de gros standard.</p>

<h2>Pourquoi c'est idéal pour Amazon FBA</h2>
<p>Amazon FBA (Fulfillment by Amazon) prend en charge le stockage, l'expédition et le service client. En tant que vendeur, votre rôle se limite à trouver le bon produit au bon prix, puis à l'envoyer dans un entrepôt Amazon. Le déstockage en gros s'intègre parfaitement dans ce modèle pour trois raisons :</p>
<ul>
<li><strong>Volume :</strong> vous achetez en lot, ce qui réduit le coût unitaire et maximise la marge par unité vendue sur Amazon.</li>
<li><strong>Produits connus :</strong> les lots de déstockage contiennent souvent des marques reconnues avec un historique de ventes Amazon vérifiable. Vous pouvez analyser le BSR (Best Seller Rank) avant d'acheter.</li>
<li><strong>Rotation rapide :</strong> les produits de marques connues se vendent vite sur Amazon, ce qui libère votre trésorerie pour réinvestir.</li>
</ul>

<h2>Où trouver des lots de déstockage ?</h2>
<p>Plusieurs canaux existent pour sourcer des lots rentables :</p>
<ul>
<li><strong>Marketplaces spécialisées :</strong> des plateformes comme Quicklot connectent directement vendeurs de lots et acheteurs professionnels, avec des vendeurs vérifiés et des paiements sécurisés.</li>
<li><strong>Grossistes en liquidation :</strong> certains grossistes se spécialisent dans le rachat de stocks invendus auprès de grandes enseignes.</li>
<li><strong>Contacts directs :</strong> les fabricants et importateurs qui se retrouvent avec des surplus sont souvent ouverts à la négociation, surtout en fin de trimestre.</li>
</ul>

<h2>Comment évaluer un lot avant d'acheter</h2>
<p>Avant de valider un achat, effectuez systématiquement cette analyse :</p>
<ol>
<li><strong>Scannez chaque ASIN</strong> sur Amazon pour vérifier le BSR, le nombre de vendeurs concurrents et le prix de vente actuel.</li>
<li><strong>Calculez votre marge nette</strong> en incluant le prix d'achat, les frais FBA (stockage + expédition), la commission Amazon et le coût de préparation.</li>
<li><strong>Vérifiez les restrictions :</strong> certaines catégories ou marques nécessitent une approbation (gated categories). Vérifiez avant d'acheter.</li>
<li><strong>Évaluez la saisonnalité :</strong> un lot de crèmes solaires en octobre se vendra mal. Analysez le graphique Keepa pour identifier les pics de demande.</li>
</ol>

<h2>Les pièges à éviter</h2>
<p>Le déstockage comporte aussi des risques. Les produits proches de la date d'expiration, les contrefaçons et les lots mélangés de mauvaise qualité sont les trois principaux dangers. Travaillez uniquement avec des vendeurs vérifiés, demandez des photos détaillées et privilégiez les plateformes qui offrent une protection acheteur.</p>

<h2>Conclusion</h2>
<p>Le déstockage en gros est un levier puissant pour les Amazon Sellers qui cherchent à diversifier leurs sources d'approvisionnement et à améliorer leurs marges. En combinant une analyse rigoureuse des lots avec une plateforme fiable comme Quicklot, vous pouvez construire un business FBA rentable et scalable.</p>
`,
  },
  {
    slug: "vendre-invendus-retours-clients-en-ligne",
    titre:
      "Invendus et retours clients : pourquoi les vendre en ligne plutôt qu'à un soldeur",
    categorie: "Guide vendeur",
    extrait:
      "Vos invendus et retours clients valent plus que ce qu'un soldeur local vous propose. Découvrez pourquoi la vente en ligne entre pros change la donne.",
    date: "3 avril 2025",
    readTime: "5 min",
    imageUrl: "https://www.quicklot.fr/blog/invendus-retours.jpg",
    imageAlt: "Vendre ses invendus et retours clients en ligne",
    ctaLabel: "Vendez sur Quicklot",
    ctaHref: "/dashboard/listing/nouveau",
    contenu: `
<p>Si vous êtes commerçant, grossiste ou importateur, vous connaissez le problème : chaque trimestre, des stocks s'accumulent. Invendus saisonniers, retours clients en parfait état, fins de série... Ces produits immobilisent votre trésorerie et occupent de l'espace en entrepôt. La solution traditionnelle — les brader à un soldeur local — vous fait perdre entre 70 et 90 % de la valeur initiale. Il existe une meilleure approche.</p>

<h2>Le problème avec les soldeurs traditionnels</h2>
<p>Un soldeur local rachète vos stocks à prix plancher, souvent entre 5 et 15 % du prix de gros. Il négocie en position de force parce qu'il sait que vous avez besoin de liquidités et d'espace. Vous n'avez aucune visibilité sur le prix final de revente, et vous ne pouvez pas mettre les acheteurs en concurrence.</p>
<p>De plus, la transaction est souvent opaque : pas de traçabilité, pas de garantie de paiement immédiat, et rarement de contrat formel. Pour un professionnel qui veut gérer proprement sa comptabilité, c'est loin d'être idéal.</p>

<h2>Pourquoi la vente en ligne entre pros est plus rentable</h2>
<p>En publiant vos lots sur une marketplace B2B spécialisée, vous bénéficiez de plusieurs avantages décisifs :</p>
<ul>
<li><strong>Visibilité nationale :</strong> au lieu de négocier avec un ou deux soldeurs locaux, vous exposez votre lot à des centaines d'acheteurs professionnels dans toute la France et la Belgique.</li>
<li><strong>Mise en concurrence :</strong> plusieurs acheteurs intéressés font monter le prix naturellement. Vos lots se vendent 2 à 5 fois plus cher qu'auprès d'un soldeur.</li>
<li><strong>Paiement sécurisé :</strong> sur Quicklot, le paiement est traité par Stripe. Vous êtes payé dès que la livraison est confirmée — pas de chèque en bois ni de promesse verbale.</li>
<li><strong>Traçabilité complète :</strong> chaque transaction est documentée avec facture, preuve de livraison et historique consultable.</li>
</ul>

<h2>Quels types de stocks vendre en ligne ?</h2>
<p>Pratiquement tout ce qui est neuf et revendable trouve preneur sur une marketplace de déstockage :</p>
<ul>
<li><strong>Fins de série :</strong> packaging ancien, produits remplacés par une nouvelle version.</li>
<li><strong>Surstocks saisonniers :</strong> décorations de Noël en janvier, maillots de bain en octobre.</li>
<li><strong>Retours clients :</strong> produits retournés en parfait état, encore emballés.</li>
<li><strong>Lots d'importation non écoulés :</strong> commandes en trop grandes quantités.</li>
</ul>

<h2>Comment maximiser la valeur de vos lots</h2>
<p>Pour obtenir le meilleur prix, soignez votre annonce :</p>
<ol>
<li><strong>Photos claires :</strong> montrez l'état réel des produits, les emballages et les étiquettes.</li>
<li><strong>Description détaillée :</strong> quantités exactes, marques, références, état du packaging.</li>
<li><strong>Prix réaliste :</strong> positionnez-vous entre 20 et 40 % du prix de gros pour une vente rapide.</li>
<li><strong>Réactivité :</strong> répondez vite aux messages des acheteurs. Une question sans réponse, c'est une vente perdue.</li>
</ol>

<h2>Un canal complémentaire, pas un remplacement</h2>
<p>La vente en ligne de stocks ne remplace pas votre activité principale. C'est un canal complémentaire qui transforme un problème (les invendus) en opportunité. Au lieu de subir la pression d'un soldeur, vous reprenez le contrôle sur le prix et les conditions de vente.</p>

<h2>Conclusion</h2>
<p>Vos invendus ont une valeur réelle. En les publiant sur une plateforme spécialisée comme Quicklot, vous touchez une audience qualifiée, vous sécurisez vos paiements et vous récupérez significativement plus que ce qu'un soldeur vous offrirait. C'est simple, rapide et professionnel.</p>
`,
  },
  {
    slug: "destockage-liquidation-surplus-differences",
    titre:
      "Déstockage, liquidation, surplus : quelles différences et comment en profiter ?",
    categorie: "Éducatif",
    extrait:
      "Déstockage, liquidation et surplus sont souvent confondus. Comprendre leurs différences vous permet de mieux négocier et d'identifier les meilleures affaires.",
    date: "28 mars 2025",
    readTime: "7 min",
    imageUrl: "https://www.quicklot.fr/blog/destockage-liquidation.jpg",
    imageAlt: "Différences entre déstockage, liquidation et surplus",
    ctaLabel: "Vendez sur Quicklot",
    ctaHref: "/dashboard/listing/nouveau",
    contenu: `
<p>Dans le monde du commerce en gros, trois termes reviennent constamment : déstockage, liquidation et surplus. Ils sont souvent utilisés de manière interchangeable, mais désignent des réalités commerciales distinctes. Comprendre ces nuances vous permet de mieux évaluer les opportunités, de négocier plus efficacement et d'éviter les pièges.</p>

<h2>Le déstockage : écouler un excédent volontairement</h2>
<p>Le déstockage est une décision commerciale proactive. Une entreprise choisit de vendre une partie de son stock à prix réduit pour libérer de l'espace, générer de la trésorerie ou faire place à de nouvelles collections. Les produits déstockés sont neufs, en parfait état et souvent accompagnés de leur garantie.</p>
<p>C'est la catégorie la plus qualitative pour un acheteur professionnel. Les raisons du déstockage sont purement logistiques ou stratégiques — le produit lui-même n'a aucun défaut. On retrouve typiquement :</p>
<ul>
<li>Les fins de saison (mode, jardinage, sport)</li>
<li>Les changements de packaging ou de référence</li>
<li>Les surstocks liés à des prévisions de vente trop optimistes</li>
<li>Les produits en approche de date limite (alimentaire, cosmétique)</li>
</ul>
<p><strong>Prix typique :</strong> 30 à 60 % du prix de gros initial.</p>

<h2>La liquidation : une vente sous contrainte</h2>
<p>La liquidation intervient quand une entreprise doit se séparer de ses stocks rapidement, souvent sous contrainte juridique ou financière. Les cas les plus fréquents sont les liquidations judiciaires (faillites), les fermetures de magasins ou les cessations d'activité.</p>
<p>Si c'est vous qui devez écouler un stock rapidement, notre guide explique <a href="/blog/liquidation-de-stock-entreprise">comment organiser une liquidation de stock</a> sans la brader.</p>
<p>Les lots de liquidation peuvent contenir d'excellentes affaires, mais demandent plus de vigilance :</p>
<ul>
<li><strong>Avantage :</strong> les prix sont souvent les plus bas du marché, parfois 10 à 20 % du prix catalogue.</li>
<li><strong>Risque :</strong> l'état des produits peut être inégal, les lots sont souvent « en vrac » sans tri préalable, et la documentation (factures d'origine, certificats) peut manquer.</li>
<li><strong>Contrainte :</strong> les ventes de liquidation sont souvent « en l'état », sans possibilité de retour.</li>
</ul>
<p>Pour un Amazon Seller, les lots de liquidation sont intéressants si vous êtes prêt à investir du temps dans le tri et la vérification de chaque produit. Les marges potentielles sont élevées, mais le risque aussi.</p>

<h2>Le surplus : ce qui n'aurait pas dû rester</h2>
<p>Le surplus désigne des marchandises produites ou commandées en excès par rapport à la demande réelle. C'est un phénomène structurel dans le commerce international : un importateur commande 10 000 unités, en vend 7 000, et se retrouve avec 3 000 unités de surplus.</p>
<p>Le surplus se distingue du déstockage par son caractère non planifié. L'entreprise n'avait pas prévu de se retrouver avec cet excédent. Les produits sont parfaitement neufs — souvent encore sur palette d'origine — mais leur propriétaire n'a plus de canal de vente pour eux.</p>
<p><strong>Opportunité clé :</strong> les surplus offrent souvent le meilleur rapport qualité-prix. Le vendeur est motivé pour écouler un stock qu'il n'avait pas budgété, et les produits sont en condition irréprochable.</p>

<h2>Tableau comparatif</h2>
<table style="width:100%;border-collapse:collapse;margin:1.5rem 0;font-size:0.9rem">
<thead>
<tr style="border-bottom:2px solid #e5e7eb">
<th style="text-align:left;padding:0.6rem;color:#111827">Critère</th>
<th style="text-align:left;padding:0.6rem;color:#111827">Déstockage</th>
<th style="text-align:left;padding:0.6rem;color:#111827">Liquidation</th>
<th style="text-align:left;padding:0.6rem;color:#111827">Surplus</th>
</tr>
</thead>
<tbody>
<tr style="border-bottom:1px solid #f3f4f6">
<td style="padding:0.6rem;color:#6b7280">Contexte</td>
<td style="padding:0.6rem">Décision volontaire</td>
<td style="padding:0.6rem">Contrainte juridique/financière</td>
<td style="padding:0.6rem">Excédent non planifié</td>
</tr>
<tr style="border-bottom:1px solid #f3f4f6">
<td style="padding:0.6rem;color:#6b7280">État des produits</td>
<td style="padding:0.6rem">Neuf, parfait</td>
<td style="padding:0.6rem">Variable</td>
<td style="padding:0.6rem">Neuf, parfait</td>
</tr>
<tr style="border-bottom:1px solid #f3f4f6">
<td style="padding:0.6rem;color:#6b7280">Prix typique</td>
<td style="padding:0.6rem">30-60 % du gros</td>
<td style="padding:0.6rem">10-25 % du gros</td>
<td style="padding:0.6rem">25-50 % du gros</td>
</tr>
<tr>
<td style="padding:0.6rem;color:#6b7280">Risque</td>
<td style="padding:0.6rem">Faible</td>
<td style="padding:0.6rem">Élevé</td>
<td style="padding:0.6rem">Faible</td>
</tr>
</tbody>
</table>

<h2>Comment en profiter concrètement</h2>
<p>Quelle que soit la catégorie, voici les principes pour tirer le meilleur parti de ces opportunités :</p>
<ol>
<li><strong>Vérifiez la source :</strong> travaillez avec des vendeurs vérifiés sur des plateformes comme Quicklot. Un vendeur vérifié, c'est un interlocuteur identifié avec une entreprise réelle.</li>
<li><strong>Analysez avant d'acheter :</strong> pour l'Amazon FBA, scannez les ASINs. Pour la revente physique, évaluez la demande locale.</li>
<li><strong>Négociez les volumes :</strong> plus vous achetez, plus votre pouvoir de négociation augmente. Un lot de 500 pièces se négocie mieux qu'un lot de 50.</li>
<li><strong>Diversifiez vos sources :</strong> ne dépendez pas d'un seul fournisseur ou d'un seul type de stock.</li>
</ol>

<h2>Conclusion</h2>
<p>Déstockage, liquidation et surplus ne sont pas synonymes. Chacun présente un profil risque-rendement différent. En comprenant ces nuances, vous pouvez cibler les opportunités qui correspondent le mieux à votre modèle d'activité — et éviter les mauvaises surprises. Sur Quicklot, chaque vendeur est vérifié et chaque transaction est sécurisée, ce qui réduit considérablement le risque quelle que soit la catégorie de stock.</p>
`,
  },
];

export function getArticles(): Article[] {
  return ARTICLES;
}

export function getArticle(slug: string): Article | undefined {
  return ARTICLES.find((a) => a.slug === slug);
}
