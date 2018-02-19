DROP SCHEMA Comics CASCADE; 
CREATE SCHEMA Comics;

CREATE TABLE Comics.Account (
    accountID           SERIAL PRIMARY KEY,
    username            VARCHAR(30) UNIQUE,
    profileURL          VARCHAR(30) UNIQUE,
    email               VARCHAR(254) UNIQUE,
    emailToken          VARCHAR(32),
    emailVerified       BOOLEAN DEFAULT false,
    biography           VARCHAR(5000),
    password            VARCHAR(256),
    salt                VARCHAR(32),
    role                VARCHAR(5) DEFAULT 'user' NOT NULL 
    CONSTRAINT allowed_roles CHECK (role = 'user' OR role = 'mod' OR role = 'admin')
);

CREATE TABLE Comics.Message (
    messageID           SERIAL PRIMARY KEY,
    senderID            INTEGER NOT NULL,
    receiverID          INTEGER NOT NULL,
    subject             VARCHAR(64),
    content             VARCHAR(5000),
    read                BOOLEAN DEFAULT false,
    timeSent            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (senderID) REFERENCES Comics.Account(accountID),
    FOREIGN KEY (receiverID) REFERENCES Comics.Account(accountID)
);

CREATE TABLE Comics.Comic (
    comicID             SERIAL PRIMARY KEY,
    accountID           INTEGER NOT NULL,
    title               VARCHAR(50) UNIQUE,
    comicURL            VARCHAR(30) UNIQUE,
    thumbnailURL        VARCHAR(255),
    published           BOOLEAN DEFAULT false,
    description         VARCHAR(500),
    FOREIGN KEY (accountID) REFERENCES Comics.Account(accountID) ON DELETE CASCADE
);

CREATE TABLE Comics.Volume (
    volumeID            SERIAL PRIMARY KEY,
    comicID             INTEGER NOT NULL,
    volumeNumber        INTEGER,
    name                VARCHAR(50),
    published           BOOLEAN DEFAULT false,
    UNIQUE( volumeNumber, comicID ),
    FOREIGN KEY (comicID) REFERENCES Comics.Comic(comicID) ON DELETE CASCADE
);

CREATE TABLE Comics.Chapter (
    chapterID           SERIAL PRIMARY KEY,
    volumeID            INTEGER,
    chapterNumber       SERIAL,
    name                VARCHAR(50),
    published           BOOLEAN DEFAULT false,
    comicID             INTEGER,
    UNIQUE( chapterNumber, volumeID, comicID ),
    FOREIGN KEY (volumeID) REFERENCES Comics.Volume(volumeID) ON DELETE CASCADE,
    FOREIGN KEY (comicID) REFERENCES Comics.Comic(comicID) ON DELETE CASCADE
);

CREATE TABLE Comics.Page (
    pageID              SERIAL PRIMARY KEY,
    pageNumber          SERIAL,
    chapterID           INTEGER,
    comicID             INTEGER NOT NULL,
    altText             VARCHAR(300),
    imgURL              VARCHAR(255),
    published           BOOLEAN DEFAULT false,
    UNIQUE ( pageNumber, comicID, chapterID ),
    FOREIGN KEY (chapterID) REFERENCES Comics.Chapter(chapterID) ON DELETE CASCADE,
    FOREIGN KEY (comicID) REFERENCES Comics.Comic(comicID) ON DELETE CASCADE
);
