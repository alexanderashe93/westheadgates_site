WESTHEAD GATES — GALLERY PHOTOS
================================

Drop photos in this folder. That's it. They appear on the gallery page
the next time it loads. Delete one and it disappears. Nothing to edit.

Accepted file types: .jpg  .jpeg  .png  .webp  .avif  .gif


CATEGORIES (optional)
---------------------
Put photos in a sub-folder and that folder becomes a filter button:

    images/
      driveway-gates/    -> a "Driveway gates" filter
        oak-gates.jpg
        estate-gates.jpg
      railings/          -> a "Railings" filter
        balcony.jpg
      loose-photo.jpg    -> shows under "All", no category

If you use no sub-folders at all, the filter buttons hide themselves.


CAPTIONS
--------
The filename becomes the caption, so name files properly:

    estate-gates-in-oak.jpg     ->  "Estate gates in oak"
    01-sliding-gate.jpg         ->  "Sliding gate"   (the 01- is stripped)

To set captions by hand instead, create a file here called captions.json:

    {
      "driveway-gates/oak-gates.jpg": "Oak-clad gates, Ormskirk",
      "railings/balcony.jpg": "Juliet balcony, powder-coated black"
    }


ORDER
-----
Newest photos appear first, based on the file's date. To control the order
yourself, set 'gallery_sort' to 'name' in api/config.php and prefix the
filenames: 01-, 02-, 03- and so on.


BEFORE YOU UPLOAD
-----------------
Resize photos to around 2000px on the long edge and save at ~80% quality.
Straight-off-the-camera files are often 8MB+, which makes the gallery slow
on a phone. Most photos should end up between 200KB and 500KB.
