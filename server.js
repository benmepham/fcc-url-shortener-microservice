"use strict";

var express = require("express");
var mongo = require("mongodb");
var mongoose = require("mongoose");
var bodyParser = require("body-parser");
var dns = require("dns");

var cors = require("cors");

var app = express();

// Basic Configuration
var port = process.env.PORT || 3000;

// DB connection
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  .catch(error => console.error(error));

app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use("/public", express.static(process.cwd() + "/public"));
app.get("/", function(req, res) {
  res.sendFile(process.cwd() + "/views/index.html");
});

const Schema = mongoose.Schema;
const urlSchema = new Schema({
  index: Number,
  url: String
});
const Url = mongoose.model("Url", urlSchema); /* = <Your Model> */

function getIndex(done) {
  Url.estimatedDocumentCount(function(err, count) {
    if (err) return console.error(err);
    done(count + 1);
  });
}

var addUrl = function(req, res) {
  let originalUrl;
  try {
    originalUrl = new URL(req.body.url);
  } catch (err) {
    return res.json({ error: "invalid URL" });
  }

  dns.lookup(originalUrl.hostname, err => {
    if (err) {
      return res.json({ error: "invalid URL" });
    }
  });

  Url.findOne({ url: originalUrl }, function(err, foundUrl) {
    if (err) return console.error(err);
    if (foundUrl) {
      return res.json({ original_url: originalUrl, short_url: foundUrl.index });
    }
    getIndex(function(count) {
      const urlRecord = new Url({
        index: count,
        url: originalUrl
      });
      urlRecord.save(function(err, data) {
        if (err) return console.error(err);
        res.json({ original_url: originalUrl, short_url: count });
      });
    });
  });
};

const processUrl = function(req, res) {
  const id = req.params.url;
  if (!parseInt(id)) {
    return res.json({ error: "format incorrect" });
  }
  Url.findOne({ index: id }, function(err, data) {
    if (err) return console.error(err);
    if (data) return res.redirect(data.url);
    res.json({ error: "No URL for input" });
  });
};

app.post("/api/shorturl/new", addUrl);

app.get("/api/shorturl/:url", processUrl);

app.listen(port, function() {
  console.log("Node.js listening ...");
});
