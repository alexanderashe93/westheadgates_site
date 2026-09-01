<?php
/**
 * Westhead Gates — site configuration.
 *
 * This is the only file you need to edit to get the contact form working.
 * Everything else reads its settings from here.
 */

return array(

    // ---------------------------------------------------------------------
    // Where enquiries are sent. Add more addresses to send to several people.
    // ---------------------------------------------------------------------
    'enquiry_recipients' => array(
        'info@westhead-gates.co.uk',
    ),

    // ---------------------------------------------------------------------
    // The address enquiries are sent FROM.
    //
    // IMPORTANT: this must be an address on your own domain, and ideally a
    // real mailbox created in Plesk. Using the visitor's own address here is
    // what lands enquiries in spam or gets them rejected outright by SPF.
    // ---------------------------------------------------------------------
    'mail_from'      => 'website@westhead-gates.co.uk',
    'mail_from_name' => 'Westhead Gates website',

    // Subject line prefix, so enquiries are easy to filter in your inbox.
    'subject_prefix' => '[Website enquiry]',

    // ---------------------------------------------------------------------
    // Gallery
    // ---------------------------------------------------------------------

    // Folder the gallery reads, relative to the site root.
    'images_dir' => 'images',

    // File types accepted. Anything else in the folder is ignored.
    'image_extensions' => array('jpg', 'jpeg', 'png', 'webp', 'avif', 'gif'),

    // Newest photos first. Set to 'name' to order by filename instead, which
    // lets you control the order with prefixes like 01-, 02-, 03-.
    'gallery_sort' => 'newest',

    // ---------------------------------------------------------------------
    // Spam controls
    // ---------------------------------------------------------------------

    // Reject submissions completed faster than this many seconds. Real people
    // take longer than 3 seconds to fill in a form; bots do not.
    'min_seconds_on_page' => 3,

    // Maximum enquiries accepted from one IP address per hour.
    'rate_limit_per_hour' => 6,
);
