# Worklog — Application web d'invitations électroniques S & R

## Mariage de Shekina BANZA & Ruth KASONGO — 28 août 2026

---

Task ID: 1 → 6 (initial build)
Agent: Z.ai Code (main)
Task: Concevoir et développer une application web complète d'invitations électroniques pour mariage (inscription, invitations PDF/JPG/QR, plan de salle, scanner, administration).

Work Log:
- **Phase 1 — Fondations** : installation des packages (qrcode, jsqr, bcryptjs, pdf-lib, jose) ; rédaction du schéma Prisma complet (18 modèles : User, LoginAttempt, WeddingSettings, Table, Seat, Guest, Invitation, InvitationMember, SeatAssignment, AttendanceLog, ScanLog, FailedScanAttempt, InvitationDownload, InvitationShare, ActivityLog) ; `bun run db:push` ; création du thème visuel (vert clair #8DA982 / ivoire #F7F3E9 / beige #E8DFCB / brun doré #C9A961) ; polices raffinées (Playfair Display, Cormorant Garamond, Jost) ; décorations florales SVG animées ; seed initial (5 comptes admin + 12 tables avec chaises).
- **Phase 2 — Backend core** : lib/constants (statuts/rôles/permissions), lib/auth (sessions JWT via jose + bcrypt + rate limiting), lib/codes (jetons opaques + codes de secours cryptographiques sans caractères ambigus), lib/qr (génération QR), lib/seat-service (attribution transactionnelle avec protection contre double-assignation, gestion zones, capacités, verrous), lib/registration (détection doublons multi-critères + création transactionnelle + mode auto/manual), lib/invitation-render (SVG → PNG/JPG via sharp + PDF A4 paysage via pdf-lib + image OG 1200×630), lib/settings (singleton avec cache).
- **Phase 3 — Espace public** : page d'accueil immersive (monogramme, noms, compte à rebours jusqu'au 28/08/2026, pétales flottants, mot des mariés, cartes cérémonie/réception, stats live) ; flux d'inscription multi-étapes (choix individu/couple → formulaire → succès/doublon) ; page d'invitation publique /i/[token] (carte élégante paysage avec QR, code de secours, table, places, OG metadata pour WhatsApp) ; téléchargement PDF/JPG/PNG ; partage WhatsApp + copie + calendrier + impression ; page de recherche par code/WhatsApp/email.
- **Phase 4 — Administration** : login sécurisé (JWT cookie httpOnly + journalisation) ; layout protégé avec barre latérale par section ; tableau de bord temps réel (KPI, jauges, derniers scans/inscriptions, refresh 8s) ; gestion invités (filtres, recherche, pagination, actions : valider/refuser/annuler/réactiver/régénérer/changer table/marquer présent/supprimer, export CSV) ; gestion tables (CRUD + verrouillage + activation + vue chaises) ; plan de salle interactif SVG (zones homme/femme/commune, chaises colorées par état, clic pour détail invité) ; paramètres (5 onglets : identité, événement, textes, design, règles) ; listes imprimables (8 vues : générale, par table, par côté, couples, seuls, présents, absents).
- **Phase 5 — Scanner** : page scanner mobile-first (caméra via getUserMedia + décodage jsqr en temps réel + saisie manuelle) ; API /api/scan (lookup par token URL ou code, classification valid/already_used/invalid/cancelled, journalisation) ; API /api/scan/confirm (confirmation entrée, arrivée partielle couple, refus, recalcul présence) ; modal de contrôle moderne avec gestion des 4 cas (valide vert, déjà utilisé orange, invalide rouge, annulé rouge).
- **Phase 6 — Vérification** : `bun run lint` propre (0 erreur) ; tests e2e via Agent Browser et curl : inscription couple (2 places consécutives T11C1+T11C2 ✓), inscription individuelle (T12C1 ✓), détection doublon WhatsApp ✓, page d'invitation ✓, génération PDF (453Ko) + JPG (410Ko) + OG (74Ko) ✓, login admin ✓, dashboard live ✓, gestion invités ✓, plan de salle ✓, scanner (valide + double scan + invalide + arrivée partielle couple) ✓.

Stage Summary:
- **Stack livrée** : Next.js 16 + TypeScript + Prisma/SQLite + Tailwind/shadcn (équivalent fonctionnel du cahier des charges Laravel/MySQL — non modifiable dans ce bac à sable).
- **Architecture** : contrôleurs légers (route handlers), services métier isolés (seat-service, registration, invitation-render, auth), validation stricte, transactions SQL pour les attributions de places, journalisation des actions sensibles (ActivityLog, ScanLog, LoginAttempt), rate limiting (login + scan + inscription), rôles/permissions (5 rôles, matrice de permissions).
- **Identité visuelle** : palette vert clair/ivoire/beige/brun doré respectée, monogramme S & R, décorations florales SVG, typographie raffinée, carte d'invitation paysage A4.
- **Comptes démo** : admin@sr-wedding.app / Admin@2026 (super_admin) ; organizer@sr-wedding.app / Org@2026 ; register@sr-wedding.app / Register@2026 ; control@sr-wedding.app / Control@2026 ; reader@sr-wedding.app / Reader@2026.
- **Données démo présentes** : 12 tables (T1-T5 côté homme, T6-T10 côté femme, T11-T12 communes, 96 chaises) ; 1 couple (Jean Mukendi & Marie Kalala, T11, arrivée partielle) ; 1 individu (Grace Banza, T12, arrivé).

## État actuel
Application **complète et fonctionnelle** sur l'ensemble du parcours critique d'inscription → invitation → scan. Toutes les fonctionnalités principales du cahier des charges sont opérationnelles et connectées à la base de données.

## Objectifs atteints / vérifications
- ✓ Inscription individuelle et couple (couple = exactement 2 places liées à 1 QR/code)
- ✓ Détection doublons (WhatsApp, email, nom, combinaison couple)
- ✓ Attribution automatique de chaises avec transactions (pas de double assignation)
- ✓ Génération PDF + JPG + PNG haute qualité
- ✓ QR code unique + code de secours cryptographique (sans caractères ambigus)
- ✓ Page invitation publique + OG metadata pour aperçu WhatsApp
- ✓ Téléchargement, impression, partage WhatsApp, ajout calendrier
- ✓ Dashboard temps réel + gestion invités + plan de salle + paramètres + listes imprimables
- ✓ Scanner caméra + saisie manuelle + gestion double scan + arrivée partielle couple
- ✓ Rôles/permissions + journalisation + rate limiting
- ✓ Design responsive et élégant

## Risques / points d'attention pour la suite
- L'aperçu WhatsApp Open Graph nécessite une URL HTTPS publique en production (`publicBaseUrl` à configurer dans Paramètres → Événement).
- La caméra du scanner nécessite HTTPS en production (getUserMedia).
- Les fichiers générés (PDF/JPG/QR) sont stockés dans `/public/storage/` — en production, envisager un stockage objet (S3) et un nettoyage périodique.
- Pas de tests automatisés formels (cahier des charges §26) — les vérifications ont été faites manuellement via Agent Browser et curl.
- Le drag-and-drop sur le plan de salle n'est pas implémenté (les déplacements se font via le menu d'actions d'un invité → « changer de table »).
- L'envoi email n'est pas configuré (architecture预留, partage WhatsApp standard uniquement).

## Recommandations prochaine phase
1. Implémenter le drag-and-drop des invités sur le plan de salle (dnd-kit déjà installé).
2. Ajouter l'export Excel (en plus du CSV) via une lib dédiée.
3. Ajouter une page d'historique détaillé des scans/activity logs pour audit.
4. Implémenter le mode hors-ligne du scanner (localStorage + sync différée).
5. Ajouter la génération d'une image sociale **personnalisée par invité** (avec vrai QR) via une route dynamique `/api/og/[token]`.
6. Ajouter des tests Playwright/Vitest couvrant les scénarios du §26.

---
Task ID: 7 (post-launch fixes)
Agent: Z.ai Code (main)
Task: Corriger l'erreur d'hydratation du compte à rebours, supprimer les données fictives, configurer 250 personnes max / 6 par table / cérémonie à 14h00.

Work Log:
- **Erreur d'hydratation corrigée** : le composant `Countdown` calculait `Date.now()` dans le `useState` initializer, produisant des valeurs différentes entre le rendu serveur et l'hydratation client. Fix : l'état initial est maintenant `null` (rendu "00" stable des deux côtés), et les vraies valeurs sont calculées uniquement côté client après le montage (`useEffect`).
- **Données fictives supprimées** : script `prisma/reset-demo.ts` créé et exécuté — supprime tous les invités, invitations, membres, attributions de chaises, logs, et fichiers générés (PDF/JPG/QR). Base remise à zéro (0 invité).
- **Configuration appliquée** :
  - `maxPeople` = 250 (limite d'invités)
  - `maxInvitations` = 160
  - `ceremonyTime` = "14h00" (au lieu de "11h00")
  - 42 tables créées avec capacité 6 chacune (252 places au total, réparties : 14 côté homme, 14 côté femme, 14 zone commune)
- **Heure codée en dur corrigée** : l'image sociale Open Graph (`renderSocialImage`) avait "Cérémonie dès 11h00" en dur — remplacé par `settings.ceremonyTime` et `settings.receptionTime` dynamiques.
- **Placeholder corrigé** : le champ "Heure cérémonie" dans les paramètres affichait "11h00" comme placeholder — corrigé en "14h00".
- **Lint** : 0 erreur après ajout du commentaire eslint-disable pour le setTime intentionnel dans le useEffect du countdown.

Stage Summary:
- ✓ Plus d'erreur d'hydratation (vérifié via Agent Browser — la page charge sans "Recoverable Error" ni "Hydration mismatch")
- ✓ 0 invité enregistré (données fictives supprimées)
- ✓ 42 tables × 6 places = 252 places (assez pour 250 max)
- ✓ Heure de cérémonie = 14h00 (visible sur la page d'accueil, l'image OG, et les paramètres)
- ✓ Compte à rebours fonctionne (48 jours, 02h, 31min, 13s au moment du test)
- ✓ Lint propre (0 erreur)

---
Task ID: 8 (cron review + user-requested fixes)
Agent: Z.ai Code (main)
Task: Corriger la cohérence visuelle entre l'aperçu et le téléchargement (police identique), faire que le QR code contienne un code de 6 caractères lié à la personne/couple, et protéger le scanner et l'administration par authentification.

Work Log:
- **Cohérence des polices (aperçu = téléchargement)** : Le problème était que le SVG (rendu par sharp/librsvg) n'avait pas accès aux polices Google Fonts (Playfair Display, Cormorant Garamond, Jost) et tombait sur Georgia/serif. Solution :
  - Téléchargé 8 fichiers TTF statiques depuis Google Fonts (`public/fonts/`) : PlayfairDisplay-400/600/700, CormorantGaramond-400/500/600, Jost-400/500.
  - Créé `src/lib/fonts.ts` qui charge les polices en base64 et génère un bloc CSS `@font-face`.
  - Modifié `buildInvitationSvg()` (maintenant async) pour intégrer ce CSS dans le `<defs>` du SVG via `<style><![CDATA[...]]></style>`.
  - Les 3 fonctions de rendu (PNG, JPG, PDF) utilisent maintenant `await buildInvitationSvg()`.
  - Résultat : le PDF et le JPG téléchargés utilisent exactement les mêmes polices que l'aperçu écran.
- **QR code = code de 6 caractères lié à la personne/couple** :
  - Ajout du champ `qrCode` (String, unique) au modèle Invitation dans le schéma Prisma + `db:push`.
  - Créé `generateQrCode()` dans `codes.ts` : génère un code de 6 caractères cryptographiquement sûr (sans caractères ambigus O/0, I/1, S/5).
  - Modifié `registerInvitation()` pour générer un `qrCode` unique à chaque inscription (avec vérification d'unicité dans la transaction).
  - Modifié `buildRenderData()` : le QR code contient maintenant `inv.qrCode` (6 caractères) au lieu de l'URL.
  - Modifié la page `/i/[token]` : le QR affiché contient aussi le code 6 caractères (cohérent avec le PDF/JPG).
  - Affichage du "Code QR" (6 caractères) ET du "Code de secours" (format long BAN-T1-X7K9) côte à côte sur l'invitation publique et le SVG téléchargé.
  - Modifié l'API `/api/scan` pour reconnaître en priorité le code 6 caractères (regex `^[A-Z0-9]{6}$`), puis l'URL, puis le token public, puis le code de secours.
  - Modifié l'API `/api/find` pour aussi chercher par qrCode et publicToken.
  - Modifié `getInvitationByCode()` pour aussi chercher par qrCode.
- **Scanner et administration protégés par authentification** :
  - Le scanner (`/scan`) vérifie maintenant l'authentification au chargement via `/api/auth/me`. Si non connecté → redirection vers `/admin/login?redirect=/scan`.
  - Ajout d'un écran de chargement ("Vérification de l'authentification...") pendant la vérification.
  - Ajout du nom de l'agent connecté + bouton déconnexion dans l'en-tête du scanner.
  - La page de login gère maintenant le paramètre `redirect` (redirige vers `/scan` après connexion si demandé).
  - Le footer public ne montre plus de lien direct vers `/scan` ni `/admin` — remplacé par "Espace équipe" → `/admin/login`.
  - L'API `/api/scan` et `/api/scan/confirm` étaient déjà protégées (vérification `can(user.role, "scanner:use")`).
- **Vérifications** :
  - Lint : 0 erreur.
  - Inscription testée : génère bien un qrCode 6 caractères (ex: TUEM37) en plus du code de secours (MUK-NA-Z6XJ).
  - Scan testé : le code 6 caractères est reconnu (result: valid, invitation trouvée).
  - Page scanner sans session → redirige vers /admin/login (vérifié via Agent Browser).
  - Page scanner avec session control_agent → s'affiche avec le nom de l'agent.
  - PDF généré (442 Ko) avec polices intégrées en base64 dans le SVG.

Stage Summary:
- ✓ Le PDF/JPG téléchargé utilise les mêmes polices que l'aperçu (Playfair Display, Cormorant Garamond, Jost intégrées en base64).
- ✓ Le QR code contient un code de 6 caractères lié à la personne/couple (champ `qrCode` unique).
- ✓ Le scanner nécessite une connexion (redirige vers /admin/login si non authentifié).
- ✓ L'administration nécessite une connexion (déjà en place, confirmé).
- ✓ Le footer public ne montre plus de lien direct vers le scanner ou l'admin.
