CREATE SCHEMA Comics;

CREATE TYPE Comics.USER_ROLE AS ENUM ('user', 'mod', 'admin');

CREATE TABLE Comics.Account (
    accountID           SERIAL PRIMARY KEY,
    username            VARCHAR(30) NOT NULL CHECK(username SIMILAR TO '[a-zA-Z0-9]+( [a-zA-Z0-9]+)*'),
    profileURL          VARCHAR(30) UNIQUE CHECK(profileURL SIMILAR TO '[-a-z0-9]+'),
    email               VARCHAR(254) NOT NULL,
    emailVerified       BOOLEAN DEFAULT false NOT NULL,
    banned              BOOLEAN DEFAULT false NOT NULL,
    biography           VARCHAR(5000),
    joined              DATE DEFAULT CURRENT_DATE NOT NULL,
    password            VARCHAR(256) NOT NULL,
    salt                VARCHAR(32) NOT NULL,
    role                Comics.USER_ROLE DEFAULT 'user' NOT NULL
);

-- Case insensative unique constraints
CREATE UNIQUE INDEX unique_username ON Comics.Account (LOWER(username));
CREATE UNIQUE INDEX unique_email    ON Comics.Account (LOWER(email));

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
    comicURL            VARCHAR(30) UNIQUE NOT NULL CHECK(comicURL SIMILAR TO '[-a-z0-9]+'),
    thumbnailURL        VARCHAR(255) NOT NULL,
    published           BOOLEAN DEFAULT false NOT NULL,
    tagline             VARCHAR(30) NOT NULL,
    description         VARCHAR(1000) NOT NULL,
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

CREATE UNIQUE INDEX chapter_max_null ON Comics.Chapter(chapterNumber, comicID) WHERE volumeID IS NULL;

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

CREATE UNIQUE INDEX page_max_null ON Comics.Page(pageNumber, comicID) WHERE chapterID IS NULL;

CREATE TYPE Comics.RELEASE_FREQUENCY  AS ENUM ('weekly', 'monthly');

CREATE TABLE Comics.Schedule (
    comicID             INTEGER,
    updateDay           INTEGER, -- Range is 1 to 7, where Sunday is 1 and Saturday is 7
    updateType          Comics.RELEASE_FREQUENCY NOT NULL,
    updateWeek          INTEGER, -- Range is 1 to 5, where the first week of month is 1
    PRIMARY KEY (comicID, updateDay),
    CONSTRAINT day_range CHECK (updateDay > 0 AND updateDay < 8), 
    CONSTRAINT week_range CHECK (updateWeek > 0 AND updateWeek < 6),
    CONSTRAINT monthly_release CHECK (updateType = 'weekly' OR (updateType = 'monthly' AND updateWeek IS NOT NULL)),
    FOREIGN KEY (comicID) REFERENCES Comics.Comic(comicID) ON DELETE CASCADE
);