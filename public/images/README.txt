WESTHEAD GATES LTD — GALLERY PHOTOS
===================================

Drop photos in this folder, commit them, and merge to main. They appear on
the gallery page as soon as the deploy finishes. Delete one and it goes.
There is no list to edit anywhere.

Accepted file types: .jpg  .jpeg  .png  .webp  .avif  .gif


CATEGORIES
----------
A sub-folder becomes a filter button on the gallery page:

    images/
      sliding-gates/      -> a "Sliding gates" filter
        louvred-sliding-gate.jpg
      balconies/          -> a "Balconies" filter
        glass-balcony.jpg
      loose-photo.jpg     -> shows under "All", no category

One level deep only — a folder is a filter button, and filters don't nest.


CAPTIONS
--------
The filename becomes the caption, so name the file as you want it to read:

    louvred-sliding-gate.jpg     ->  "Louvred sliding gate"
    01-glass-balcony.jpg         ->  "Glass balcony"   (the 01- is stripped)

To write a caption by hand instead, add it to captions.json in this folder.
That is also how to get capitals right in the middle of a caption, e.g.
"Ornate Juliet balcony".


ORDER
-----
Newest file first. The four at the front also fill the "Recent work" strip
on the home page, so put the best work in most recently.


SIZE
----
Resize to about 2000px on the long edge before committing. These files live
in the repository for good, so a folder of 8MB camera originals is permanent.
