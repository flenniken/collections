# Create User

This note tells how to create a new website user so they can login,
how to list users and how to use the AWS Cognito console for other
tasks.

[⬇](#Contents) (table of contents at the bottom)

# Create New User

You add a new user with the cognito createUser command.  It creates
the user in AWS Cognito then it outputs text for an email that you
manually send.

You need the user’s email and their first and last name. For example,
to add the John Doe user:

~~~
scripts/cognito --createUser \
  john@doe.com \
  John \
  Doe \
  False
~~~

The last parameter is whether the user is an admin. It’s often
convenient to use plus sign emails for admins, see the Plus Sign
Emails section about these type of email addresses.

The command outputs the text for an email that you manually send. For
example:

~~~
Welcome to Collections.

Sign in with your email and the temporary password below. It will step you through creating a new password.

It’s best to run Collections on an iPhone. If you are, copy and paste the link into the Safari browser:

https://collections.sflennik.com/index.html

user name: john@doe.com
Password: temppass1234

Steve
~~~

# Plus Sign Emails

You can use the plus sign in emails to make multiple unique email
addresses that go to the same place. For example:

* steve.flenniken@gmail.com
* steve.flenniken+admin@gmail.com

[⬇](#Contents)

# List Users

You can list all the users with the -l option. The last value is the
user id:

~~~
scripts/cognito -l

admin: Steve Flenniken <steve.flenniken+admin@gmail.com> 0801f3d0-8041-70db-6366-c3161ab7589f
 user: Steve Flenniken <steve.flenniken@gmail.com> 0861d3e0-00a1-7058-ad19-4d7b1880d276
...
~~~

# AWS Cognito Console

You use the Cognito console to disable or delete users and other tasks
not covered by the cognito script.

# Contents

* [Create New User](#create-new-user) -- how to create a new website user so they can login.
* [Plus Sign Emails](#plus-sign-emails) -- how to use the plus sign for multiple emails to the same location.
* [List Users](#list-users) -- how to list all the users.
* [AWS Cognito Console](#aws-cognito-console) -- how to use the cognito console for user management.


<style>body { max-width: 40em}</style>
