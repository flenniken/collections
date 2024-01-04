# This builds a development environment for the Collections project.

FROM debian:12
MAINTAINER Steve Flenniken
ENV coder_env=debian

# Install base apps.
RUN apt update && apt -qy install less man sudo tree curl \
  wget nano git jq libpcre3 libpcre3-dev rsync

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

# Install gulp command line.
RUN npm install --global gulp-cli

# Install bashrc for the prompt and some aliases.
COPY --chown=coder:coder bashrc /home/coder/.bashrc

# Switch to coder user for following commands.
USER coder

# Install node modules in the global space in the coder folder, the
# parent of collections. This installs all modules specified in the
# package.json file.

WORKDIR /home/coder/
COPY --chown=coder:coder package.json package.json
Run npm install

# Start in the collections directory.
WORKDIR /home/coder/collections
CMD ["/bin/bash"]

