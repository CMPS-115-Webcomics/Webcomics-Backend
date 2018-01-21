DROP SCHEMA Comics CASCADE; 
CREATE SCHEMA Comics;

CREATE TABLE Comics.Account (
    accountID           SERIAL PRIMARY KEY,
    username            VARCHAR(30) UNIQUE,
    profileURL          VARCHAR(30) UNIQUE,
    email               VARCHAR(30) UNIQUE,
    emailToken          VARCHAR(32),
    emailVerified       BOOLEAN DEFAULT false,
    biography           TEXT,
    password            VARCHAR(256),
    salt                VARCHAR(32)
);

CREATE TABLE Comics.Comic (
    comicID             SERIAL PRIMARY KEY,
    accountID           INTEGER NOT NULL,
    title               VARCHAR(50),
    comicURl            VARCHAR(30) UNIQUE,
    description         VARCHAR(500),
    usesChapters        BOOLEAN,
    usesVolumes         BOOLEAN,
    FOREIGN KEY (accountID) REFERENCES Comics.Account(accountID)
);

CREATE TABLE Comics.Volume (
    volumeID            SERIAL PRIMARY KEY,
    comicID             INTEGER NOT NULL,
    volumeNumber        INTEGER UNIQUE,
    name                VARCHAR(50) UNIQUE,
    FOREIGN KEY (comicID) REFERENCES Comics.Comic(comicID)
);

CREATE TABLE Comics.Chapter (
    chapterID           INTEGER,
    volumeID            INTEGER,
    chapterNumber       SERIAL UNIQUE,
    name                VARCHAR(50) UNIQUE,
    comicID             INTEGER,
    PRIMARY KEY (chapterID),
    FOREIGN KEY (volumeID) REFERENCES Comics.Volume(volumeID),
    FOREIGN KEY (comicID) REFERENCES Comics.Comic(comicID)
);

CREATE TABLE Comics.Page (
    pageId              INTEGER PRIMARY KEY,
    pageNumber          SERIAL UNIQUE,
    chapterID           INTEGER,
    comicID             INTEGER,
    author              INTEGER,
    altText             VARCHAR(300),
    imgURL              VARCHAR(128),
    UNIQUE (pageNumber, volumeID, chapterID),
    FOREIGN KEY (chapterID) REFERENCES Comics.chapterID(chapterID),
    FOREIGN KEY (comicID) REFERENCES Comics.Comic(comicID)
);