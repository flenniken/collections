# You use this docker file to build a container for the Collections
# project.  It contains all the programs needed to build the app. Use
# runenv to build and run the container.  When running type g to see
# the available commands.

FROM debian:12
MAINTAINER Steve Flenniken

# Environment variable used to detect when we are running in the
# container.
ENV coder_env=debian

# Install apps and libraries.
RUN apt update && apt -qy install less man sudo tree curl \
  wget nano git jq libpcre3 libpcre3-dev rsync nginx \
  python3-requests python3-jwt unzip

# Install glow for viewing markdown at the command line.
# https://github.com/charmbracelet/glow
RUN apt -qy install gpg
RUN mkdir -p /etc/apt/keyrings
RUN curl -fsSL https://repo.charm.sh/apt/gpg.key \
  | gpg --dearmor -o /etc/apt/keyrings/charm.gpg
RUN echo "deb [signed-by=/etc/apt/keyrings/charm.gpg] \
  https://repo.charm.sh/apt/ * *" \
  | tee /etc/apt/sources.list.d/charm.list
RUN apt update && apt install glow

# Create a linux user called coder with sudo permissions and no
# password.
RUN mkdir -p /etc/sudoers.d \
  && echo "coder ALL=(ALL) NOPASSWD: ALL" > /etc/sudoers.d/coder \
  && chmod 440 /etc/sudoers.d/coder \
  && adduser --disabled-password --gecos '' coder \
  && usermod -aG sudo coder \
  && echo 'coder:devenv' | chpasswd

RUN chown coder:coder /home/coder

# Install statictea.
COPY statictea /usr/bin

# Install nodejs.  See available versions with "apt-cache policy nodejs".
ENV NODE_MAJOR=21
ENV NODEJS=18.19.0+dfsg-6~deb12u1
RUN apt install -qy ca-certificates gnupg
RUN curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key \
  | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg
RUN echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] \
  https://deb.nodesource.com/node_$NODE_MAJOR.x nodistro main" \
  | tee /etc/apt/sources.list.d/nodesource.list
RUN apt update && apt -qy install nodejs=$NODEJS npm

# Install typescript, gulp and other global command line apps.
RUN npm install --global gulp-cli
RUN npm install --global w3c-html-validator
RUN npm install --global typescript

# Install bashrc for the prompt and some aliases.
COPY --chown=coder:coder bashrc /home/coder/.bashrc

# Install more packages.
RUN apt -qy install python3-boto3

# Switch to coder user for following commands.
USER coder

# You can add more gulp plugins / node modules. In the docker container
# install the plugin you want, for example for the "gulp-if" plugin:
#   npm install --save-dev gulp-if
# Then copy the modified package.json to the debian folder overwriting
# the existing one:
#   cp ../package.json env/debian/
# Then build a new docker image and container.

# Configure nginx.
COPY nginx-config /etc/nginx/sites-available/default
RUN chmod +x /home/coder

WORKDIR /home/coder/
COPY --chown=coder:coder package.json package.json

# Install node modules in the global space in the coder folder, the
# parent of collections. This installs all modules specified in the
# package.json file.
RUN npm install

# Install aws cli in the ~/aws folder
RUN curl "https://awscli.amazonaws.com/awscli-exe-linux-aarch64.zip" -o "awscliv2.zip"
RUN unzip awscliv2.zip
RUN sudo ./aws/install

# Start in the collections directory.
WORKDIR /home/coder/collections

# Start nginx and leave the container running in bash.
CMD sudo nginx && /bin/bash
