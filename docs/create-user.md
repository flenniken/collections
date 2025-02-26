# Create User

This note tells how to create a new website user. You add a new user
using the AWS Cognito console in two steps, first create the user then
set their name.

[⬇](#Contents) (table of contents at the bottom)

# Create New User

You create a new website user by specifying their email address and a
temporary password. In the console find the "Create user" button at
this path:

~~~
Amazon Cognito > User pools > collections-pool > Users > Create user
~~~

* select "Send an email invitation"
* add email: e.g. steve.Flenniken+steps@gmail.com
* enter a temporary password: e.g. Password1$
* push "Create user" button

[⬇](#Contents)

# Set User Name

In the console edit the user and set their name.

* User attributes > Edit
* click "Add Attribute"
* in the Attribute Name editbox type "given_name"
* in the Value edit box type name, e.g. "Steve"
* Click add another
* in the Attribute Name editbox type their "family_name"
* in the Value edit box type their name, e.g. "Flenniken"
* optionally add custom:admin, true
* push the Save button

The user will receive an email telling them their email address and
password.  The password will expire if not used in 7 days.  The first
time they login, they set a permanent password.

[⬇](#Contents)

# Reset Password

You can reset a user's password from the command line:

~~~
# from container
aws cognito-idp admin-set-user-password \
  --user-pool-id us-west-2_4czmlJC5x \
  --username f86103f0-7021-705f-290b-aa443e8605c2 \
  --password Temp1pass= --no-permanent
~~~

It takes a few minutes for the user to receive their email.

# Plus Sign Emails

You can use the plus sign in emails for testing so multiple unique
email addresses go to the same place. For example:

* steve.flenniken@gmail.com
* steve.flenniken+admin@gmail.com

[⬇](#Contents)

# Verify User

Verify the new user by listing all the users:

~~~
scripts/cognito -l

admin: Steve Flenniken <steve.flenniken+admin@gmail.com>
 user: Steve Flenniken <steve.flenniken@gmail.com>
~~~

# Contents

* [Create New User](create-new-user) -- how to create a new website user.
* [Set User Name](set-user-name) -- how to set the new user's name.
* [Reset Password](reset-password) -- how to reset a user's password.
* [Plus Sign Emails](plus-sign-emails) -- how to use the plus sign for multiple emails to the same location
* [Verify User](verify-user) -- how to verify the new user got created correctly.
