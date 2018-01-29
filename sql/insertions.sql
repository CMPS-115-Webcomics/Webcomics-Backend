INSERT INTO Comics.Account (
    username,
    profileURL,
    email,
    biography,
    password,
    salt
) VALUES ('Billy', 'billys-url', 'billy@example.com', 'billy is a nice guy', 'sefesfesfsef', 'fxfgee');


INSERT INTO Comics.Comic (
    comicID, accountID, title, comicURL, description, thumbnailURL
) VALUES (
    3, 1, 'not cool', 'lame', 'one page comic', 'http://www.banamalon.net/wiki/images/b/b9/Icon_my_photo_frame_wp8.png'
);
INSERT INTO Comics.Volume (
    volumeID, comicID, volumeNumber, name
) VALUES (
    1, 3, 1, 'a'
);
INSERT INTO Comics.Volume (
    volumeID, comicID, volumeNumber, name
) VALUES (
    2, 3, 2, 'oak'
);

INSERT INTO Comics.Chapter (
    chapterID, chapterNumber, volumeID, comicID, name
) VALUES (
    1, 1, 1, 3, 'chappie'
);
INSERT INTO Comics.Chapter (
    chapterID, chapterNumber, volumeID, comicID, name
) VALUES (
    2, 2, 1, 3, 'upset'
);
INSERT INTO Comics.Chapter (
    chapterID, chapterNumber, volumeID, comicID, name
) VALUES (
    3, 1, 2, 3, 'a'
);

INSERT INTO Comics.Page (
    pageID, pageNumber, chapterID, comicID, authorID, altText, imgURL
) VALUES (
    1, 1, 1, 3, 1, 'first page', 'http://www.normfeuticartoons.com/wp-content/uploads/2016/01/gil42.jpg'
);
INSERT INTO Comics.Page (
    pageID, pageNumber, chapterID, comicID, authorID, altText, imgURL
) VALUES (
    2, 2, 1, 3, 1, 'first page', 'http://www.normfeuticartoons.com/wp-content/uploads/2016/01/gil42.jpg'
);
INSERT INTO Comics.Page (
    pageID, pageNumber, chapterID, comicID, authorID, altText, imgURL
) VALUES (
    3, 1, 2, 3, 1, 'first page', 'http://www.normfeuticartoons.com/wp-content/uploads/2016/01/gil42.jpg'
);
INSERT INTO Comics.Page (
    pageID, pageNumber, chapterID, comicID, authorID, altText, imgURL
) VALUES (
    4, 1, 3, 3, 1, 'first page', 'http://www.normfeuticartoons.com/wp-content/uploads/2016/01/gil42.jpg'
);
INSERT INTO Comics.Page (
    pageID, pageNumber, chapterID, comicID, authorID, altText, imgURL
) VALUES (
    5, 2, 3, 3, 1, 'first page', 'http://www.normfeuticartoons.com/wp-content/uploads/2016/01/gil42.jpg'
);
INSERT INTO Comics.Page (
    pageID, pageNumber, chapterID, comicID, authorID, altText, imgURL
) VALUES (
    6, 3, 3, 3, 1, 'first page', 'http://www.normfeuticartoons.com/wp-content/uploads/2016/01/gil42.jpg'
);
INSERT INTO Comics.Page (
    pageID, pageNumber, chapterID, comicID, authorID, altText, imgURL
) VALUES (
    7, 4, 3, 3, 1, 'first page', 'http://www.normfeuticartoons.com/wp-content/uploads/2016/01/gil42.jpg'
);
