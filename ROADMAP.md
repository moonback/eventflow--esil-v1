# 🗺️ ROADMAP - EventFlow

Ce document détaille la feuille de route stratégique et technique pour le développement futur de **EventFlow**. L'objectif est d'amener l'application d'un MVP robuste à une solution logistique de qualité entreprise.

---

## 🟢 Phase 1 : Consolidation du MVP (En Cours / Court Terme)
*Objectif : Stabiliser les fonctionnalités fondamentales et garantir une expérience utilisateur fluide.*

### 1. Fonctionnalités Cœur
- [x] Authentification complète avec Supabase.
- [x] CRUD complet sur le Matériel (Inventaire), les Véhicules et le Personnel.
- [x] Création et assignation de Missions (Planning).
- [x] Vue Mobile basique pour le pointage des équipements.
- [x] Scripts SQL de base de données fiables et idempotents (`supabase.sql`).

### 2. Améliorations Immédiates
- [ ] **Génération & Impression de QR Codes :** Module pour générer des QR Codes uniques pour chaque équipement et permettre une impression par lots.
- [ ] **Filtres et Recherche Avancée :** Ajouter la recherche en temps réel et des filtres multicritères sur les tableaux (Inventaire, Véhicules).
- [ ] **Gestion des Rôles (RBAC) :** Restreindre l'accès à certaines vues en fonction du rôle de l'utilisateur (ex: un *technician* ne voit que la `MobileView` et son profil, le *manager* voit tout).
- [ ] **Fiabilisation Offline :** Améliorer la synchronisation Dexie <-> Supabase lors de la reconnexion au réseau (Background Sync).

---

## 🟡 Phase 2 : Enrichissement Fonctionnel (Moyen Terme)
*Objectif : Ajouter de l'intelligence logicielle et des outils d'optimisation pour le quotidien des managers.*

### 1. Planification et Conflits
- [ ] **Détection de Conflits :** Alerte en temps réel si un équipement ou un véhicule est réservé sur deux missions chevauchantes.
- [ ] **Vue Calendrier / Gantt :** Transformer la page Planning en un calendrier interactif (Drag & Drop de missions, vue chronologique).

### 2. Notifications & Temps Réel
- [ ] **WebSockets avec Supabase Realtime :** Mise à jour instantanée du statut des missions et du matériel sur tous les écrans connectés.
- [ ] **Notifications In-App :** Alertes pour les chauffeurs et techniciens lorsqu'une nouvelle mission leur est assignée.
- [ ] **Rapports d'Incidents Push :** Notification immédiate au *dispatcher* lorsqu'un équipement est signalé "en panne" depuis l'application mobile.

### 3. Gestion de Maintenance (Véhicules & Matériel)
- [ ] **Suivi Kilométrique et Contrôle Technique :** Alertes automatiques pour l'entretien des véhicules.
- [ ] **Historique de Maintenance :** Journalisation des réparations du matériel avec gestion des coûts.

---

## 🟠 Phase 3 : Reporting, Analytics et Documents (Long Terme)
*Objectif : Fournir des indicateurs clés de performance (KPI) et automatiser la paperasse.*

### 1. Tableaux de Bord Analytiques
- [ ] **Statistiques d'Utilisation :** Taux de rotation du matériel (quel matériel est le plus souvent loué/utilisé).
- [ ] **Coûts Logistiques :** Calcul de la rentabilité des missions selon le temps passé, l'usure du matériel et le carburant.
- [ ] **Analyse des Incidents :** Graphiques sur les pannes les plus fréquentes par catégorie d'équipement.

### 2. Documents et Exports
- [ ] **Manifestes de Chargement (Bon de livraison) :** Génération automatique au format PDF des listes d'équipements par véhicule avec zone de signature numérique.
- [ ] **Export de Données :** Exportation CSV/Excel de la flotte, du matériel et de l'historique des missions pour la comptabilité.

---

## 🔴 Phase 4 : Évolutions Majeures et Écosystème (Vision Finale)
*Objectif : Transformer EventFlow en une plateforme incontournable interconnectée.*

### 1. Application Native ou PWA Avancée
- [ ] **Scanner de Code-barres / QR Code Natif :** Utiliser les API natives (via Capacitor ou React Native) pour une lecture de QR Code ultra-rapide et l'accès à la lampe torche.
- [ ] **GPS et Géolocalisation :** Tracking en temps réel des véhicules lors des déplacements vers les lieux de mission (Intégration Google Maps / Mapbox).
- [ ] **Signature Électronique Avancée :** Validation des livraisons sur tablette avec valeur légale.

### 2. Intégrations Tierces (API)
- [ ] **ERP / Comptabilité :** Intégration avec QuickBooks, Xero ou Stripe pour la facturation des clients liée aux missions.
- [ ] **Ressources Humaines :** Suivi du temps de travail, heures supplémentaires, et frais de déplacement exportables vers des outils de paie.
- [ ] **Fournisseurs externes :** Sous-location de matériel automatisée si le stock interne est insuffisant.
