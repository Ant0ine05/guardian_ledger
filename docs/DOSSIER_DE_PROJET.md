# Dossier de Projet

---

# Guardian Ledger

### Application Full-Stack de gestion d'inventaire Destiny 2

**Projet personnel — Formation Concepteur Développeur d'Applications**

**Dalstein Antoine**

---

## Remerciements

Je tiens à adresser mes sincères remerciements à toutes les personnes qui ont contribué, de près ou de loin, à la réalisation de ce projet et à l'aboutissement de ma formation.

Je remercie en premier lieu **l'équipe pédagogique de l'école IT** pour la qualité de l'enseignement dispensé tout au long de la formation Concepteur Développeur d'Applications. Leurs retours, leur disponibilité et leur exigence m'ont permis de progresser régulièrement et d'aborder ce projet avec les bases solides nécessaires.

Je remercie également **l'entreprise Horloges-Huchez** et l'ensemble de mon équipe d'alternance pour m'avoir accordé leur confiance et pour m'avoir permis de mettre en pratique mes compétences en situation professionnelle réelle. Cette expérience en alternance a considérablement enrichi ma vision du développement logiciel et m'a appris à travailler dans un contexte d'équipe avec des contraintes concrètes.

Enfin, je remercie ma famille et mes proches pour leur soutien constant durant cette période de formation.

---

## I. Introduction

### Parcours

Je m'appelle **Dalstein Antoine**. Après l'obtention de mon **BTS SIO option SLAM** (Services Informatiques aux Organisations — Solutions Logicielles et Applications Métiers), j'ai souhaité approfondir mes compétences en développement logiciel en intégrant la formation **Concepteur Développeur d'Applications** à l'**École IT**, en alternance au sein de l'entreprise **Horloges-Huchez**.

Mon BTS SIO m'a apporté les fondamentaux du développement : algorithmique, bases de données relationnelles, développement web côté client et serveur, et premières notions de gestion de projet. La formation CDA m'a permis de franchir une nouvelle étape en me confrontant à des architectures plus complexes, à la conception orientée objet, aux bonnes pratiques de tests et à la démarche DevOps.

### Contexte du projet

Guardian Ledger est né d'une double passion : le développement web et le jeu vidéo **Destiny 2**. L'objectif était de concevoir et développer, dans le cadre de ma formation CDA, une application full-stack complète et fonctionnelle permettant aux joueurs de Destiny 2 de consulter et gérer leur inventaire depuis un navigateur web, via l'API officielle de Bungie.net.

Le choix de ce sujet n'est pas anodin : en choisissant une API tierce complexe avec un protocole OAuth 2.0 complet, un manifeste de données massif (~300 Mo) et des contraintes techniques inattendues, je me suis volontairement placé dans des conditions proches d'un projet professionnel réel, bien au-delà d'un exercice académique classique.

### Ce que ce projet m'a apporté

Ce projet est entièrement personnel. Il m'a permis de mettre en pratique l'ensemble des compétences acquises durant ma formation, en situation réelle de développement :

- **Conception** d'une architecture REST découplée frontend/backend
- **Authentification** double-couche (JWT applicatif + OAuth 2.0 Bungie)
- **Intégration d'API tierces** avec gestion du cycle de vie des tokens
- **Gestion de bases de données** avec Prisma ORM et SQLite
- **Tests automatisés** (66 tests, backend + frontend)
- **Conteneurisation** Docker et intégration continue GitHub Actions

Ce dossier de projet présente l'ensemble de cette réalisation, de la conception à la mise en place des tests, en passant par les choix techniques et les problèmes rencontrés.