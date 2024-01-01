# This builds a development environment for the Collections project.

FROM debian:12
MAINTAINER Steve Flenniken
ENV coder_env=debian

# Install base apps.
RUN apt update && apt -qy install less man sudo tree curl \
  wget nano git jq libpcre3 libpcre3-dev

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

# Switch to coder user for following commands.
USER coder
WORKDIR /home/coder

# Install bashrc for the prompt and some aliases.
COPY --chown=coder:coder bashrc .bashrc

# Start in the collections directory.
WORKDIR /home/coder/collections
CMD ["/bin/bash"]

