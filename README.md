# EventFlow

EventFlow est une application web moderne et performante conçue pour la gestion complète de la logistique événementielle. Elle permet de gérer les missions, le matériel (avec gestion des stocks et scan), la flotte de véhicules, ainsi que le personnel sur le terrain.

## 🚀 Fonctionnalités Principales

- **Tableau de Bord (Dashboard) :** Vue d'ensemble des activités, missions en cours et alertes.
- **Gestion des Missions (Planning) :** Planification des événements, assignation du matériel, des véhicules et du personnel.
- **Gestion de l'Inventaire :** Suivi du matériel, états de fonctionnement, et catégories.
- **Gestion de la Flotte (Vehicles) :** Suivi des véhicules, capacités et statuts.
- **Gestion du Personnel (Staff) :** Gestion des profils utilisateurs (Techniciens, Chauffeurs, Managers).
- **Application Mobile (MobileView) :** Interface optimisée pour le terrain permettant aux équipes de scanner le matériel (In/Out) et de reporter des incidents.
- **Mode Hors-Ligne (Offline-First) :** Utilisation de base de données locale (Dexie) pour assurer la continuité sur le terrain même sans réseau.

## 🛠️ Stack Technique

- **Frontend :** React 19, Vite, TypeScript
- **Styling :** Tailwind CSS v4, Lucide React (Icônes)
- **Animations :** Motion (Framer Motion)
- **Gestion d'État :** Zustand
- **Base de Données Locale (Offline) :** Dexie.js (IndexedDB)
- **Backend & Auth :** Supabase (PostgreSQL, Authentification, Storage, Realtime)
- **Routage :** React Router v7

## 📂 Structure du Projet

```text
eventflow/
├── src/
│   ├── components/      # Composants UI réutilisables (Layout, etc.)
│   ├── contexts/        # Contextes React (AuthContext)
│   ├── db/              # Configuration Dexie (Offline DB)
│   ├── lib/             # Clients et utilitaires (Supabase client)
│   ├── pages/           # Vues principales de l'application
│   │   ├── Auth.tsx
│   │   ├── Dashboard.tsx
│   │   ├── Inventory.tsx
│   │   ├── MobileView.tsx
│   │   ├── Planning.tsx
│   │   ├── Settings.tsx
│   │   ├── Staff.tsx
│   │   └── Vehicles.tsx
│   ├── App.tsx          # Configuration des routes
│   └── main.tsx         # Point d'entrée de l'application
├── supabase.sql         # Script de création du schéma de la BDD Supabase
├── package.json         # Dépendances et scripts
└── vite.config.ts       # Configuration Vite
```

## ⚙️ Installation & Démarrage

### 1. Prérequis
- Node.js (v18+ recommandé)
- Un compte [Supabase](https://supabase.com)

### 2. Cloner le projet et installer les dépendances
```bash
npm install
```

### 3. Configuration de l'environnement
Créez un fichier `.env` à la racine du projet (vous pouvez utiliser `.env.example` comme modèle) :
```env
VITE_SUPABASE_URL=votre_url_supabase
VITE_SUPABASE_ANON_KEY=votre_cle_anon_supabase
```

### 4. Configuration de la base de données
Exécutez le script SQL `supabase.sql` dans l'éditeur SQL de votre interface Supabase. Ce script va :
- Créer les tables nécessaires (`profiles`, `missions`, `equipment`, `vehicles`, `mission_equipment`, `incidents`).
- Mettre en place les politiques de sécurité (RLS).
- Configurer les triggers pour la création automatique de profils à l'inscription.
- Préparer le bucket de stockage pour les avatars.

### 5. Démarrer le serveur de développement
```bash
npm run dev
```
L'application sera accessible sur `http://localhost:3000`.

## 🔒 Sécurité
- **Row Level Security (RLS)** est activé sur toutes les tables Supabase.
- L'authentification gère différents rôles (`dispatcher`, `technician`, `driver`, `manager`).
