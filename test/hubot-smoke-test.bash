#! /bin/bash

# Hack per:
# http://stackoverflow.com/questions/4774054/reliable-way-for-a-bash-script-to-get-the-full-path-to-itself
pushd $(dirname $0) >/dev/null
PACKAGE_ROOT=$(dirname $(pwd -P))
popd >/dev/null
cd ${PACKAGE_ROOT}

COFFEE=${PACKAGE_ROOT}/node_modules/coffee-script/bin/coffee
echo -n "Executing hubot-smoke-test: "
export HUBOT_GITHUB_TOKEN="<bogus-18f-github-token>"
exec ${COFFEE} ${PACKAGE_ROOT}/node_modules/hubot/bin/hubot -t
