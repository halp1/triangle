// src/channel/index.ts
var NodeError = Error;
var ChannelAPI;
((ChannelAPI2) => {
  class Error2 extends NodeError {
    constructor(type, message) {
      super(`[CH API] ${type}: ${message}`);
    }
  }
  ChannelAPI2.Error = Error2;
  ChannelAPI2.randomSessionID = (length = 20) => Array.from(
    { length },
    () => ["qwertyuiop[asdfghjklzxcvbnmQWERTYUIOPASDFGHJKLZXCVBNM1234567890"][Math.floor(Math.random() * (26 + 26 + 10))]
  ).join("");
  const config = {
    sessionID: (0, ChannelAPI2.randomSessionID)(),
    host: "https://ch.tetr.io/api/",
    caching: true
  };
  ChannelAPI2.getConfig = () => config;
  ChannelAPI2.setConfig = (newConfig) => {
    Object.assign(config, newConfig);
  };
  const cache = {};
  ChannelAPI2.clearCache = () => {
    Object.keys(cache).forEach((k) => delete cache[k]);
  };
  ChannelAPI2.get = async ({
    route,
    args = {
      data: {},
      format: []
    },
    query = {},
    options = config
  }) => {
    let uri = route;
    args.format.forEach((arg) => {
      if (arg in args.data) {
        uri = uri.replaceAll(`:${arg}`, args.data[arg]);
      } else {
        throw new Error2(
          "Argument Error",
          `Missing argument ${arg.toString()} in route ${route}`
        );
      }
    });
    Object.keys(query).forEach((key) => {
      uri += `?${key}=${query[key]}`;
    });
    if (config.caching && cache[uri]) {
      if (cache[uri].until > Date.now()) {
        return cache[uri].data;
      } else {
        delete cache[uri];
      }
    }
    let res;
    try {
      res = await fetch(`${options.host || config.host}${uri}`, {
        headers: options.sessionID || config.sessionID ? {
          "X-Session-ID": options.sessionID || config.sessionID
        } : {}
      }).then((r) => r.json());
      if (res.success === false) {
        throw new Error2("Server Error", `${res.error.msg} at ${uri}`);
      } else {
        if (config.caching) {
          cache[uri] = {
            until: res.cache.cached_until,
            data: res.data
          };
        }
        return res.data;
      }
    } catch (e) {
      throw new Error2("Network Error", `${e.message} at ${uri}`);
    }
  };
  let generator;
  ((generator2) => {
    generator2.empty = (route, res) => async () => {
      const r = await (0, ChannelAPI2.get)({ route });
      if (res) return r[res];
      return r;
    };
    generator2.args = (route, res) => {
      const base = route.split("/").filter((v) => v.startsWith(":")).map((v) => v.slice(1));
      async function getArgs(...args2) {
        const argData = {};
        if (typeof args2[0] === "string") {
          if (args2.length !== base.length)
            throw new Error2(
              "Argument Error",
              `Invalid number of arguments for ${route}: Expected ${base.length}, found ${args2.length}`
            );
          base.forEach((v, i) => argData[v] = args2[i]);
        } else {
          base.forEach((v) => {
            if (!(v in args2[0]))
              throw new Error2(
                "Argument Error",
                `Missing argument ${v.toString()} for ${route}`
              );
            argData[v] = args2[0][v];
          });
        }
        const r = await (0, ChannelAPI2.get)({
          route,
          args: { data: argData, format: base }
        });
        if (res) return r[res];
        return r;
      }
      return getArgs;
    };
    generator2.query = (route, res) => async (query2 = {}) => {
      const r = await (0, ChannelAPI2.get)({ route, query: query2 });
      if (res) return r[res];
      return r;
    };
    generator2.argsAndQuery = (route, res) => {
      const base = route.split("/").filter((v) => v.startsWith(":")).map((v) => v.slice(1));
      async function getArgsAndQuery(...args2) {
        const argData = {};
        let query2 = {};
        if (typeof args2[0] === "string") {
          if (args2.length === base.length + 1 && typeof args2[base.length] === "object") {
            query2 = args2.pop();
          }
          if (args2.length !== base.length)
            throw new Error2(
              "Argument Error",
              `Invalid number of arguments for ${route}: Expected ${base.length}, found ${args2.length}`
            );
          base.forEach((v, i) => argData[v] = args2[i]);
        } else {
          base.forEach((v) => {
            if (!(v in args2))
              throw new Error2(
                "Argument Error",
                `Missing argument ${v.toString()} for ${route}`
              );
            argData[v] = args2[0][v];
          });
          if (typeof args2[1] === "object") {
            query2 = args2[1];
          }
        }
        const r = await (0, ChannelAPI2.get)({
          route,
          args: { data: argData, format: base },
          query: query2
        });
        if (res) return r[res];
        return r;
      }
      return getArgsAndQuery;
    };
  })(generator = ChannelAPI2.generator || (ChannelAPI2.generator = {}));
  let general;
  ((general2) => {
    general2.stats = generator.empty("general/stats");
    general2.activity = generator.empty(
      "general/activity",
      "activity"
    );
  })(general = ChannelAPI2.general || (ChannelAPI2.general = {}));
  let users;
  ((users2) => {
    users2.get = generator.args("users/:user");
    let summaries;
    ((summaries2) => {
      summaries2.fourtyLines = generator.args(
        "users/:user/summaries/40l"
      );
      summaries2.blitz = generator.args(
        "users/:user/summaries/BLITZ"
      );
      summaries2.quickPlay = generator.args(
        "users/:user/summaries/zenith"
      );
      summaries2.zenith = summaries2.quickPlay;
      summaries2.expertQuickPlay = generator.args("users/:user/summaries/zenithex");
      summaries2.zenthiex = summaries2.expertQuickPlay;
      summaries2.tetraLeague = generator.args(
        "users/:user/summaries/league"
      );
      summaries2.tl = summaries2.tetraLeague;
      summaries2.zen = generator.args(
        "users/:user/summaries/zen"
      );
      summaries2.achievements = generator.args("users/:user/summaries/achievements", "achievements");
      summaries2.all = generator.args(
        "users/:user/summaries"
      );
    })(summaries = users2.summaries || (users2.summaries = {}));
    users2.search = generator.args(
      "users/search/:query",
      "users"
    );
    users2.leaderboard = generator.argsAndQuery("users/by/:leaderboard", "entries");
    users2.lb = users2.leaderboard;
    users2.history = generator.argsAndQuery("users/history/:leaderboard/:season", "entries");
    users2.personalRecords = generator.argsAndQuery("users/:user/records/:gamemode/:leaderboard", "entries");
    users2.records = users2.personalRecords;
  })(users = ChannelAPI2.users || (ChannelAPI2.users = {}));
  let records;
  ((records2) => {
    records2.leaderboard = generator.argsAndQuery("/records/:leaderboard", "entries");
    records2.lb = records2.leaderboard;
    records2.search = generator.query("records/search");
  })(records = ChannelAPI2.records || (ChannelAPI2.records = {}));
  let news;
  ((news2) => {
    news2.all = generator.query("news/");
    news2.latest = generator.argsAndQuery("news/:stream", "news");
    news2.stream = news2.latest;
  })(news = ChannelAPI2.news || (ChannelAPI2.news = {}));
  let labs;
  ((labs2) => {
    labs2.scoreflow = generator.args(
      "labs/scoreflow/:user/:gamemode"
    );
    labs2.leagueflow = generator.args(
      "labs/leagueflow/:user"
    );
  })(labs = ChannelAPI2.labs || (ChannelAPI2.labs = {}));
  ChannelAPI2.achievements = generator.args(
    "achievements/:k"
  );
})(ChannelAPI || (ChannelAPI = {}));
export {
  ChannelAPI as CH,
  ChannelAPI,
  ChannelAPI as ch,
  ChannelAPI as default
};
