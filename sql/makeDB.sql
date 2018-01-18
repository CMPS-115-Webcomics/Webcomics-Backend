CREATE TABLE Author (
    authorID            INTEGER PRIMARY KEY,
    name                VARCHAR(30) UNIQUE,
    url                 VARCHAR(30) UNIQUE,
    biography           TEXT
);

CREATE TABLE Comic (
    comicID             INTEGER PRIMARY KEY,
    authorID            INTEGER NOT NULL,
    name                VARCHAR(50),
    url                 VARCHAR(30) UNIQUE,
    description         VARCHAR(500),
    FOREIGN KEY (authorID) REFERENCES Author(authorID)
);

CREATE TABLE Volume (
    volumeID            INTEGER,
    comicID             INTEGER,
    chapterNumber       INTEGER UNIQUE,
    author              INTEGER,
    name                VARCHAR(50) UNIQUE,
    PRIMARY KEY (volumeID),
    FOREIGN KEY (comicID) REFERENCES Comic(comicID)
);

CREATE TABLE Chapter (
    chapterID           INTEGER,
    volumeID            INTEGER,
    chapterNumber       INTEGER UNIQUE,
    author              INTEGER,
    name                VARCHAR(50) UNIQUE,
    PRIMARY KEY (chapterID),
    FOREIGN KEY (comicID) REFERENCES Comic(comicID)
);

CREATE TABLE Page (
    pageNumber          INTEGER,
    chapterNumber       INTEGER,
    volumeNumber        INTEGER
    comicID             INTEGER NOT NULL,
    author              INTEGER,
    altText             VARCHAR(300),
    PRIMARY KEY (pageNumber, chapterNumber, volumeNumber),
    FOREIGN KEY (comicID) REFERENCES Comic(comicID)
);