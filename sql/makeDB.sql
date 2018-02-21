CREATE SCHEMA Comics;

CREATE TYPE USER_ROLE AS ENUM ('user', 'mod', 'admin');

CREATE TABLE Comics.Account (
    accountID           SERIAL PRIMARY KEY,
    username            VARCHAR(30) UNIQUE NOT NULL,
    profileURL          VARCHAR(30) UNIQUE,
    email               VARCHAR(254) UNIQUE NOT NULL,
    emailVerified       BOOLEAN DEFAULT false NOT NULL,
    banned              BOOLEAN DEFAULT false NOT NULL,
    biography           VARCHAR(5000),
    joined              DATE DEFAULT CURRENT_DATE NOT NULL,
    password            VARCHAR(256) NOT NULL,
    salt                VARCHAR(32) NOT NULL,
    role                USER_ROLE DEFAULT 'user' NOT NULL
);

CREATE TABLE Comics.Message (
    messageID           SERIAL PRIMARY KEY,
    senderID            INTEGER NOT NULL,
    receiverID          INTEGER NOT NULL,
    subject             VARCHAR(64) NOT NULL,
    content             VARCHAR(5000) NOT NULL,
    read                BOOLEAN DEFAULT false NOT NULL,
    timeSent            TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY (senderID) REFERENCES Comics.Account(accountID) ON DELETE CASCADE,
    FOREIGN KEY (receiverID) REFERENCES Comics.Account(accountID) ON DELETE CASCADE
);

CREATE TABLE Comics.Comic (
    comicID             SERIAL PRIMARY KEY,
    accountID           INTEGER NOT NULL,
    title               VARCHAR(50) UNIQUE NOT NULL,
    comicURL            VARCHAR(30) UNIQUE NOT NULL,
    thumbnailURL        VARCHAR(255) NOT NULL,
    published           BOOLEAN DEFAULT false NOT NULL,
    description         VARCHAR(500) NOT NULL,
    created             DATE DEFAULT CURRENT_DATE NOT NULL,
    updated             DATE DEFAULT CURRENT_DATE NOT NULL,
    FOREIGN KEY (accountID) REFERENCES Comics.Account(accountID) ON DELETE CASCADE
);

CREATE TABLE Comics.Volume (
    volumeID            SERIAL PRIMARY KEY,
    comicID             INTEGER NOT NULL,
    volumeNumber        INTEGER NOT NULL,
    name                VARCHAR(50),
    published           BOOLEAN DEFAULT false NOT NULL,
    UNIQUE( volumeNumber, comicID ),
    FOREIGN KEY (comicID) REFERENCES Comics.Comic(comicID) ON DELETE CASCADE
);

CREATE TABLE Comics.Chapter (
    chapterID           SERIAL PRIMARY KEY,
    volumeID            INTEGER,
    chapterNumber       INTEGER NOT NULL,
    name                VARCHAR(50),
    published           BOOLEAN DEFAULT false,
    comicID             INTEGER NOT NULL,
    UNIQUE( chapterNumber, volumeID, comicID ),
    FOREIGN KEY (volumeID) REFERENCES Comics.Volume(volumeID) ON DELETE CASCADE,
    FOREIGN KEY (comicID) REFERENCES Comics.Comic(comicID) ON DELETE CASCADE
);

CREATE TABLE Comics.Page (
    pageID              SERIAL PRIMARY KEY,
    pageNumber          INTEGER NOT NULL,
    chapterID           INTEGER,
    comicID             INTEGER NOT NULL,
    altText             VARCHAR(300),
    imgURL              VARCHAR(255),
    published           BOOLEAN DEFAULT false,
    UNIQUE ( pageNumber, comicID, chapterID ),
    FOREIGN KEY (chapterID) REFERENCES Comics.Chapter(chapterID) ON DELETE CASCADE,
    FOREIGN KEY (comicID) REFERENCES Comics.Comic(comicID) ON DELETE CASCADE
);
