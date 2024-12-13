# Overviews

[![icon](rounded-icon.png)](#)

This page has general overviews about how the code works and why it is
done the way it is.

[⬇](#Contents) (table of contents at the bottom)

# Login

As you login, your name, token, expire date and other login details
are stored in local storage. Existence of this data, tells whether you
are logged in or not.

When you log out, the login local data is deleted and you are logged
out of cognito.

Admin users see the debugging refresh and airplane icons at the bottom
of the index page and the airplane on the image page.

Collections uses the AWS Cognito service to handle login.  This allows
collections to be a public static website without a backend server
(other than AWS).

Users login with an email and a password. You add and remove users
manually. Admin users see debugging controls in the UI.

# Create or Edit User

You create a new Collections user with the cognito command from the
docker container.  For example, to add a user to the
"collections-pool" do the following:

~~~
# from docker container
scripts/cognito -u collections-pool
~~~

The command will prompt for the needed information. Below is an
example:

~~~
# from docker container
scripts/cognito -u collections-pool

This command will add a new user after prompting for their information.

Enter email address, e.g. steve.flenniken@gmail.com
email?: tom.bombadil@gmail.com
Enter given name, e.g. Steve
given name?: Tom
Enter family name, e.g. Flenniken
family name?: Bombadil
Is the user an admin, True or False?: True
password?:
~~~

If you want to edit an existing user, list the users to find the
user’s id then use the -e option to edit them.

Find user, for example Tom Bombadil:

~~~
# from docker container
scripts/cognito -l collections-pool | less

...
email: tom.bombadil@gmail.com
first: Tom
last: Bombadil
id: 0861b3f0-e041-707e-bb34-4a03ac172325
status: CONFIRMED
created: 2024-10-04 20:45:39 UTC
admin: true
...
~~~

Edit user Tom bombadil:

~~~
# from docker container
scripts/cognito -e collections-pool  0861b3f0-e041-707e-bb34-4a03ac172325

Type in the new user settings or type enter to leave as is.
tom.bombadil@gmail.com, email?:
Tom, given name?: Thomas
Bombadil, family name?:
true, admin (True or False)?:
password?(use blank to leave as is):

email: tom.bombadil@gmail.com
first: Thomas
last: Bombadil
admin: true
Password: unchanged
~~~

You use the AWS console to disable or delete a user

[⬇ ────────](#Contents)

# Deploy

The deplog script copies the changed files to S3 and invalidates them.

The CloudFront cache control setting determine how long the file is
pulled from the cloudfront cache. The default is 24 hours. Once the
time has expired, cloudfront looks in S3 for new content.

You can issue CloudFront invalidation requests every time your site is
updated so the new files are removed from the cache.  The deploy
script does this.

[⬇ ────────](#Contents)

# Contents

* [Login](#login) -- how the login process works.
* [Create or Edit User](#create-or-edit-user) -- how to create a new user or edit an existing one.
* [Deploy](#deploy) -- how to deploy and and invalidate files and how the cloudfront cache works.
