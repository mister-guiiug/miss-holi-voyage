/**
 * Les dictionnaires de l'application, une entrée par locale et TOUTES DE MÊME
 * FORME : `createI18n` dérive le type des clés du dictionnaire de repli, et le
 * compilateur refuse ensuite `t('cle.qui.nexiste.pas')`.
 *
 * Deux locales seulement ici. En ajouter une se fait en copiant `fr` et en
 * traduisant : la forme, elle, est vérifiée à la compilation.
 *
 * CE FICHIER NE CONTIENT PAS LES LIBELLÉS DES COMPOSANTS DU SOCLE (« Fermer »,
 * « Réessayer », « Retour »…). Ils vivent dans `react/labels`, en sept langues,
 * et `I18nProvider` pose `LabelsProvider` avec la locale courante tout seul.
 * Les redéclarer ici, c'est le travail que sept apps ont fait dans huit
 * fichiers-pont d'environ quatre cents lignes, avant que le socle ne porte les
 * traductions.
 */
/**
 * PAS DE `as const` ICI, et c'est délibéré. Il figerait chaque chaîne
 * française comme son PROPRE type littéral, et le dictionnaire anglais devrait
 * alors contenir… les mêmes mots français. La forme est ce qui doit
 * correspondre, pas le contenu.
 */
const fr = {
  app: {
    name: 'Miss Holi Voyage',
    tagline:
      'Preparez un voyage en famille : profil du foyer, questions IA, dates et vols, style hub ou roadtrip, shortlist d excursions - decisions partagees.',
  },
  nav: {
    home: 'Accueil',
    settings: 'Réglages',
    account: 'Compte',
    about: 'À propos',
  },
  home: {
    title: 'Notes',
    loading: 'Chargement des notes',
    empty: 'Aucune note pour le moment.',
    emptyHint: 'La première note montrera la persistance versionnée.',
    add: 'Ajouter',
    field: 'Nouvelle note',
    placeholder: 'Ce que je ne veux pas oublier',
    remove: 'Supprimer',
    removed: 'Note supprimée',
    undo: 'Annuler',
    count: {
      one: '{count} note',
      other: '{count} notes',
    },
    sync: {
      refused: {
        one: '{count} écriture refusée par la base : {error}',
        other: '{count} écritures refusées par la base : {error}',
      },
      retry: 'Réessayer',
    },
  },
  settings: {
    title: 'Réglages',
    appearance: 'Apparence',
    language: 'Langue',
    data: 'Données',
    export: 'Exporter mes notes',
    import: 'Importer mes notes',
    importConfirm: 'Remplacer les notes actuelles ?',
    importBody:
      'Le fichier remplacera tout ce qui est sur cet appareil. Exportez d’abord si vous voulez garder l’état actuel.',
    imported: {
      one: '{count} note importée.',
      other: '{count} notes importées.',
    },
    importFailed: 'Fichier refusé : {error}',
    reset: 'Tout effacer',
    resetConfirm: 'Effacer toutes les notes ?',
    resetBody: 'Cette action est définitive.',
    backend: 'Source de données',
    backendLocal: 'Cet appareil seulement',
  },
  account: {
    title: 'Compte',
    localMode: 'Mode local',
    localModeBody:
      "Aucun backend n'est configuré : tout reste sur cet appareil. L'écran est là quand même — un écran masqué par une condition finit par diverger de celui qui s'affiche.",
    signOut: 'Se déconnecter',
    admin: 'Administration',
    linkIntro:
      'Un lien à usage unique arrive dans votre boîte : aucun mot de passe à retenir, ni à voler.',
    linkSentTitle: 'Lien envoyé',
    linkSentBody:
      "Un lien vient d'être envoyé à {email}. Ouvrez-le depuis cet appareil : il vous ramènera ici, connecté·e. Il n'est valable qu'une fois.",
    linkAgain: 'Recevoir un autre lien',
    usePassword: 'Se connecter avec un mot de passe',
    useLink: 'Recevoir un lien plutôt',
    danger: {
      title: 'Zone dangereuse',
      body: 'Supprimer votre compte efface vos notes, votre profil et le compte lui-même. Rien n’est conservé, et cette action ne s’annule pas.',
      action: 'Supprimer mon compte',
      confirmLabel: 'Retapez votre adresse pour confirmer',
      confirmHint: 'L’adresse du compte est {email}.',
      confirm: 'Supprimer définitivement',
      cancel: 'Annuler',
      mismatch: 'L’adresse saisie ne correspond pas : rien n’a été supprimé.',
      failed: 'La suppression a échoué : {error}',
    },
  },

  about: {
    title: 'À propos',
    what: 'Preparez un voyage en famille : profil du foyer, questions IA, dates et vols, style hub ou roadtrip, shortlist d excursions - decisions partagees.',
  },

  voyage: {
    noHousehold: 'Aucun foyer',
    noHouseholdHint:
      'Créez un foyer pour y ranger le profil familial et les voyages.',
    householdName: 'Nom du foyer',
    createHousehold: 'Créer le foyer',
    inviteToken: 'Jeton d’invitation',
    acceptInvite: 'Rejoindre un foyer',
    members: 'membres',
    memberName: 'Prénom / surnom',
    addMember: 'Ajouter',
    createInvite: 'Créer une invitation',
    inviteReady: 'Jeton à partager',
    trips: 'Voyages',
    noTrips: 'Pas encore de voyage.',
    tripTitle: 'Titre du voyage',
    createTrip: 'Créer le voyage',
    noDestination: 'Destination à définir',
    tripMissing: 'Voyage introuvable.',
    backHome: 'Retour à l’accueil',
    markReady: 'Marquer prêt',
    lock: 'Verrouiller',
    suggestQuestions: 'Proposer des questions IA',
    answer: 'Réponse',
    saveAnswer: 'Enregistrer',
    country: 'Pays',
    region: 'Région',
    dateStart: 'Début de fenêtre',
    dateEnd: 'Fin de fenêtre',
    budget: 'Budget plafond (EUR)',
    flightLabel: 'Option de vol',
    flightPrice: 'Prix',
    flightPaste: 'Coller le détail',
    addFlight: 'Ajouter l’option',
    choose: 'Retenir',
    chosen: 'Retenue',
    proposeStyles: 'Proposer hub / roadtrip',
    chooseStyle: 'Choisir ce style',
    currentStyle: 'Style actuel',
    proposePois: 'Proposer des sites',
    artifactsTitle: 'Artefacts pays (v1.5)',
    artifactsDeferred:
      'Schéma prêt ; génération désactivée en MVP. Types prévus :',
    decisions: 'Journal de décisions',
    step: {
      destination: 'Destination',
      specs: 'Questions de spécification',
      dates: 'Fenêtre de dates',
      flights: 'Vols aller-retour',
      style: 'Hub ou roadtrip',
      excursions: 'Excursions / sites',
    },
    vote: {
      interested: 'Oui',
      maybe: 'Peut-être',
      no: 'Non',
    },
  },
};

const en: typeof fr = {
  app: {
    name: 'Miss Holi Voyage',
    // TODO traduire : create-lg-pwa-app a recopié ici la description française.
    tagline:
      'Preparez un voyage en famille : profil du foyer, questions IA, dates et vols, style hub ou roadtrip, shortlist d excursions - decisions partagees.',
  },
  nav: {
    home: 'Home',
    settings: 'Settings',
    account: 'Account',
    about: 'About',
  },
  home: {
    title: 'Notes',
    loading: 'Loading notes',
    empty: 'No notes yet.',
    emptyHint: 'The first note will show versioned persistence at work.',
    add: 'Add',
    field: 'New note',
    placeholder: "What I don't want to forget",
    remove: 'Delete',
    removed: 'Note deleted',
    undo: 'Undo',
    count: {
      one: '{count} note',
      other: '{count} notes',
    },
    sync: {
      refused: {
        one: '{count} write refused by the database: {error}',
        other: '{count} writes refused by the database: {error}',
      },
      retry: 'Retry',
    },
  },
  settings: {
    title: 'Settings',
    appearance: 'Appearance',
    language: 'Language',
    data: 'Data',
    export: 'Export my notes',
    import: 'Import my notes',
    importConfirm: 'Replace the current notes?',
    importBody:
      'The file will replace everything on this device. Export first if you want to keep the current state.',
    imported: {
      one: '{count} note imported.',
      other: '{count} notes imported.',
    },
    importFailed: 'File rejected: {error}',
    reset: 'Erase everything',
    resetConfirm: 'Erase all notes?',
    resetBody: 'This cannot be undone.',
    backend: 'Data source',
    backendLocal: 'This device only',
  },
  account: {
    title: 'Account',
    localMode: 'Local mode',
    localModeBody:
      'No backend is configured: everything stays on this device. The screen is still here — a screen hidden behind a condition drifts away from the one that shows.',
    signOut: 'Sign out',
    admin: 'Admin',
    linkIntro:
      'A one-time link lands in your inbox: no password to remember, none to steal.',
    linkSentTitle: 'Link sent',
    linkSentBody:
      'A link was just sent to {email}. Open it from this device: it brings you back here, signed in. It only works once.',
    linkAgain: 'Send another link',
    usePassword: 'Sign in with a password',
    useLink: 'Send me a link instead',
    danger: {
      title: 'Danger zone',
      body: 'Deleting your account erases your notes, your profile and the account itself. Nothing is kept, and this cannot be undone.',
      action: 'Delete my account',
      confirmLabel: 'Type your address again to confirm',
      confirmHint: 'The account address is {email}.',
      confirm: 'Delete permanently',
      cancel: 'Cancel',
      mismatch: 'The address does not match: nothing was deleted.',
      failed: 'Deletion failed: {error}',
    },
  },

  about: {
    title: 'About',
    // TODO traduire : create-lg-pwa-app a recopié ici la description française.
    what: 'Preparez un voyage en famille : profil du foyer, questions IA, dates et vols, style hub ou roadtrip, shortlist d excursions - decisions partagees.',
  },

  voyage: {
    noHousehold: 'No household yet',
    noHouseholdHint: 'Create a household for family profile and trips.',
    householdName: 'Household name',
    createHousehold: 'Create household',
    inviteToken: 'Invite token',
    acceptInvite: 'Join a household',
    members: 'members',
    memberName: 'First name / nickname',
    addMember: 'Add',
    createInvite: 'Create invite',
    inviteReady: 'Token to share',
    trips: 'Trips',
    noTrips: 'No trips yet.',
    tripTitle: 'Trip title',
    createTrip: 'Create trip',
    noDestination: 'Destination TBD',
    tripMissing: 'Trip not found.',
    backHome: 'Back home',
    markReady: 'Mark ready',
    lock: 'Lock',
    suggestQuestions: 'Suggest AI questions',
    answer: 'Answer',
    saveAnswer: 'Save',
    country: 'Country',
    region: 'Region',
    dateStart: 'Window start',
    dateEnd: 'Window end',
    budget: 'Budget ceiling (EUR)',
    flightLabel: 'Flight option',
    flightPrice: 'Price',
    flightPaste: 'Paste details',
    addFlight: 'Add option',
    choose: 'Select',
    chosen: 'Selected',
    proposeStyles: 'Propose hub / roadtrip',
    chooseStyle: 'Pick this style',
    currentStyle: 'Current style',
    proposePois: 'Propose places',
    artifactsTitle: 'Country artifacts (v1.5)',
    artifactsDeferred: 'Schema ready; generation off in MVP. Planned types:',
    decisions: 'Decision log',
    step: {
      destination: 'Destination',
      specs: 'Spec questions',
      dates: 'Date window',
      flights: 'Round-trip flights',
      style: 'Hub or roadtrip',
      excursions: 'Excursions / sites',
    },
    vote: {
      interested: 'Yes',
      maybe: 'Maybe',
      no: 'No',
    },
  },
};

export const messages = { fr, en };
export type Messages = typeof fr;
