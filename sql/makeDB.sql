DROP SCHEMA Comics CASCADE; 
CREATE SCHEMA Comics;

CREATE TABLE Comics.Account (
    accountID           SERIAL PRIMARY KEY,
    username            VARCHAR(30) UNIQUE,
    profileURL          VARCHAR(30) UNIQUE,
    email               VARCHAR(254) UNIQUE,
    emailToken          VARCHAR(32),
    emailVerified       BOOLEAN DEFAULT false,
    biography           TEXT,
    password            VARCHAR(256),
    salt                VARCHAR(32)
);

CREATE TABLE Comics.Comic (
    comicID             SERIAL PRIMARY KEY,
    accountID           INTEGER NOT NULL,
    title               VARCHAR(50) UNIQUE,
    comicURL            VARCHAR(30) UNIQUE,
    thumbnailURL        VARCHAR(30),
    published           BOOLEAN DEFAULT false,
    description         VARCHAR(500),
    FOREIGN KEY (accountID) REFERENCES Comics.Account(accountID)
);

CREATE TABLE Comics.Volume (
    volumeID            SERIAL PRIMARY KEY,
    comicID             INTEGER NOT NULL,
    volumeNumber        INTEGER,
    name                VARCHAR(50) UNIQUE,
    published           BOOLEAN DEFAULT false,
    UNIQUE( volumeNumber, comicID ),
    FOREIGN KEY (comicID) REFERENCES Comics.Comic(comicID)
);

CREATE TABLE Comics.Chapter (
    chapterID           SERIAL PRIMARY KEY,
    volumeID            INTEGER,
    chapterNumber       SERIAL,
    name                VARCHAR(50) UNIQUE,
    published           BOOLEAN DEFAULT false,
    comicID             INTEGER,
    UNIQUE( chapterNumber, volumeID, comicID ),
    FOREIGN KEY (volumeID) REFERENCES Comics.Volume(volumeID),
    FOREIGN KEY (comicID) REFERENCES Comics.Comic(comicID)
);

CREATE TABLE Comics.Page (
    pageID              SERIAL PRIMARY KEY,
    pageNumber          SERIAL,
    chapterID           INTEGER,
    comicID             INTEGER,
    authorID            INTEGER,
    altText             VARCHAR(300),
    imgURL              VARCHAR(128),
    published           BOOLEAN DEFAULT false,
    UNIQUE ( pageNumber, comicID, chapterID ),
    FOREIGN KEY (chapterID) REFERENCES Comics.chapterID(chapterID),
    FOREIGN KEY (comicID) REFERENCES Comics.Comic(comicID)
);