FROM circleci/python:3.6

RUN curl -s https://packagecloud.io/install/repositories/github/git-lfs/script.deb.sh | sudo bash
RUN sudo apt update
RUN sudo apt -y -qq install locales-all git-lfs parallel postgresql openjdk-8-jdk curl

