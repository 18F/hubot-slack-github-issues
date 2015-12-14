#! /bin/bash

# Hack per:
# http://stackoverflow.com/questions/4774054/reliable-way-for-a-bash-script-to-get-the-full-path-to-itself
pushd $(dirname $0) >/dev/null
PACKAGE_ROOT=$(dirname $(pwd -P))
popd >/dev/null

export HUBOT_SLACK_GITHUB_ISSUES_CONFIG_PATH="${PACKAGE_ROOT}/test/helpers/test-config.json"

COFFEE=${PACKAGE_ROOT}/node_modules/coffee-script/bin/coffee
echo -n "Executing hubot-smoke-test: "
exec ${COFFEE} ${PACKAGE_ROOT}/node_modules/hubot/bin/hubot -t
