# You use this docker file to build a container for the Collections
# project.  It contains all the programs needed to build the app. Use
# runenv to build and run the container.  When running type g to see
# the available commands.

FROM debian:12
MAINTAINER Steve Flenniken

# Environment variable used to detect when we are running in the
# container.
ENV coder_env=debian

# Install the needed apps and libraries.
RUN apt-get update && apt-get -qy install less man sudo tree curl \
  wget nano git jq libpcre3 libpcre3-dev rsync nginx \
  python3-requests python3-jwt unzip python3-boto3 \
  dnsutils procps zip cron

# Install glow for viewing markdown at the command line.
# https://github.com/charmbracelet/glow
RUN apt-get -qy install gpg
RUN mkdir -p /etc/apt/keyrings
RUN curl -fsSL https://repo.charm.sh/apt/gpg.key \
  | gpg --dearmor -o /etc/apt/keyrings/charm.gpg
RUN echo "deb [signed-by=/etc/apt/keyrings/charm.gpg] \
  https://repo.charm.sh/apt/ * *" \
  | tee /etc/apt/sources.list.d/charm.list
RUN apt-get update && apt-get install glow

# Create a linux user called coder with sudo permissions and no
# password.
RUN mkdir -p /etc/sudoers.d \
  && echo "coder ALL=(ALL) NOPASSWD: ALL" > /etc/sudoers.d/coder \
  && chmod 440 /etc/sudoers.d/coder \
  && adduser --disabled-password --gecos '' coder \
  && usermod -aG sudo coder \
  && echo 'coder:devenv' | chpasswd

# Correct the coder home folder permissions.
RUN chown coder:coder /home/coder

# Install statictea.
COPY statictea /usr/bin

# Install nodejs.  See available versions with "apt-cache policy
# nodejs".

# The node versions don't last very long so you need to update
# frequently. The version that comes with Debian will be out-of-date
# in 18 months, way before Debian needs to be updated.  Instead of the
# Debian node package you use the PPA repository for the version you
# want, for example 22.  There is a script for installing.

# Install Node.js 22.x using NodeSource's script.
RUN apt-get update && apt-get install -y curl \
 && curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
 && apt-get install -y nodejs

# Install typescript, gulp and other global node command line apps.
RUN npm install --global gulp-cli
RUN npm install --global w3c-html-validator
RUN npm install --global typescript

# Install bashrc for the prompt and some aliases.
COPY --chown=coder:coder bashrc /home/coder/.bashrc

# Install cron job to delete old log files every hour.
COPY deleteOldLogs /etc/cron.d/deleteOldLogs

# Install the python pillow package for reading jpg files by the maker
# command.
RUN apt-get -qy install python3-pillow

# Switch to coder user for following commands.
USER coder

# You can add more gulp plugins / node modules. In the docker container
# install the plugin you want, for example for the "gulp-if" plugin:
#
#   npm install --save-dev gulp-if
#
# This will update the packages.json file. Copy the file to the debian
# environment so the package will be installed the next time you build
# the docker container.
#
#   cp ~/package.json env/debian/
#
# Note: sharing the node_modules folder between the Mac and Debian
# doesn't work very well because gulp scans the modules folder which
# adds a 2 second delay to running it.

# Configure nginx.
COPY nginx-config /etc/nginx/sites-available/default
RUN chmod +x /home/coder

# Run the following commands in the coder home folder.
WORKDIR /home/coder/

# Install node modules in the global space in the coder folder, the
# parent of collections. This installs all modules specified in the
# package.json file. The node modules are for the gulp build system
# and for testing the lambda function.  The collections js doesn't use
# them.

COPY --chown=coder:coder package.json package.json
RUN npm install

# Install aws command line app in the ~/aws folder
RUN curl "https://awscli.amazonaws.com/awscli-exe-linux-aarch64.zip" -o "awscliv2.zip"
RUN unzip awscliv2.zip
RUN sudo ./aws/install

# Copy in the glow config file.
COPY --chown=coder:coder glow.yml /home/coder/.config/glow/glow.yml

# Start in the collections directory.
WORKDIR /home/coder/collections

# Start cron, nginx and leave the container running in bash.
CMD sudo service cron start; sudo nginx && /bin/bash
