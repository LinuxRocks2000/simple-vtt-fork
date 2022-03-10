document.getElementById("js-message").style.display = "none";

let args = {};
document.URL.split("?")[1] ? document.URL.split("?")[1].split("&").forEach((arg, i) => {
  let splitArg = arg.split("=");
  args[splitArg[0]] = splitArg[1];
}) : null;

if (localStorage.getItem("scale") === null) {
  localStorage.setItem("scale", 100);
}

let board = {
  "dimensions": [0, 0],
  "pieces": {},
  "lines": {}
}


// <states>

const States = Object.freeze({
  NEUTRAL: Symbol("neutral"), // nothing selected
  LINE_DRAW_A: Symbol("lineA"), // line drawing, no point yet
  LINE_DRAW_B: Symbol("lineB"), // line drawing, only 1 point
  PIECE_SELECTED: Symbol("piece"), // piece selected
  DELETE: Symbol("delete"), // delete mode
  ADD_PIECE_A: Symbol("addA"), // add piece, not complete
  ADD_PIECE_B: Symbol("addB"), // add piece, not completeDimensionsDimensions
});

var state = States.NEUTRAL;
var stateData = null;

// </states>


let elementGrid = []

var wsReady = false;
var jsonReady = false;


var ws;

fetch("/api/wslink").then((response) => {
  return response.json();
}).then((json) => {
  ws = new WebSocket(json.link);

  ws.onopen = () => {
    ws.send(`&A;${args.id}`);

    document.getElementById("main-menu").className = "menu"
    document.getElementById("body").style.cursor = "default";
    document.getElementById("board-holder").style.display = "inherit";

    wsReady = true;

    // <mapping-buttons> //

    // // add piece button
    document.getElementById("menu-create-piece").addEventListener("click", event => {
      state = States.ADD_PIECE_A;
      stateData = null;
      document.getElementById("main-menu").className = "hidden-menu";
      document.getElementById("add-piece-menu").className = "menu";
    });

    // add piece cancel
    document.getElementById("piece-menu-close").addEventListener("click", event => {
      state = States.NEUTRAL;
      stateData = null;
      document.getElementById("main-menu").className = "menu";
      document.getElementById("add-piece-menu").className = "hidden-menu";

      document.getElementById("piece-menu-name-input").value = "";
      document.getElementById("piece-menu-icon-input").value = "";
      var img = document.getElementById("piece-menu-preview");
      img.title = "";
      img.src = "";
    });

    // add piece preview
    document.getElementById("piece-menu-load").addEventListener("click", event => {
      state = States.ADD_PIECE_B;
      stateData = {
        name: document.getElementById("piece-menu-name-input").value,
        icon: document.getElementById("piece-menu-icon-input").value
      }
      var img = document.getElementById("piece-menu-preview");
      img.title = stateData.name;
      img.src = stateData.icon;
    });


    // // add line button
    document.getElementById("menu-create-line").addEventListener("click", event => {
      state = States.LINE_DRAW_A;
      stateData = null;
      document.getElementById("main-menu").className = "hidden-menu";
      document.getElementById("add-line-menu").className = "menu";
    });

    // add line cancel
    document.getElementById("line-menu-close").addEventListener("click", event => {
      state = States.NEUTRAL;
      stateData = null;
      document.getElementById("main-menu").className = "menu";
      document.getElementById("add-line-menu").className = "hidden-menu";
    });


    // // delete button
    document.getElementById("menu-delete").addEventListener("click", event => {
      state = States.DELETE;
      stateData = null;
      document.getElementById("main-menu").className = "hidden-menu";
      document.getElementById("delete-menu").className = "menu";
    });

    // delete cancel
    document.getElementById("delete-menu-close").addEventListener("click", event => {
      state = States.NEUTRAL;
      stateData = null;
      document.getElementById("main-menu").className = "menu";
      document.getElementById("delete-menu").className = "hidden-menu";
    });


    // // config button
    document.getElementById("menu-config").addEventListener("click", event => {
      document.getElementById("config-menu-scale-input").value = getScale();
      document.getElementById("config-menu-dims-input-x").value = board.dimensions[0];
      document.getElementById("config-menu-dims-input-y").value = board.dimensions[1];

      document.getElementById("main-menu").className = "hidden-menu";
      document.getElementById("config-menu").className = "menu";
    });

    // config cancel
    document.getElementById("config-menu-close").addEventListener("click", event => {
      document.getElementById("main-menu").className = "menu";
      document.getElementById("config-menu").className = "hidden-menu";
    });

    // config scale
    document.getElementById("config-menu-rescale").addEventListener("click", event => {
      var scaleInput = document.getElementById("config-menu-scale-input").value;

      if (scaleInput < 50) {
        document.getElementById("config-menu-scale-input").value = 50;
      } else if (scaleInput > 300) {
        document.getElementById("config-menu-scale-input").value = 300;
      } else {
        localStorage.setItem("scale", document.getElementById("config-menu-scale-input").value);
        window.location.reload();
      }
    });

    // config dimensions
    document.getElementById("config-menu-dims-apply").addEventListener("click", event => {
      var dimsInputX = Math.round(document.getElementById("config-menu-dims-input-x").value);
      var dimsInputY = Math.round(document.getElementById("config-menu-dims-input-y").value);

      if (dimsInputX >= 1 && dimsInputX <= 100 && dimsInputY >= 1 && dimsInputY <= 100) {
        ws.send(`&B;${dimsInputX},${dimsInputY}`);
        return;
      }

      if (dimsInputX < 1) {
        document.getElementById("config-menu-dims-input-x").value = 1;
      } else if (dimsInputX > 100) {
        document.getElementById("config-menu-dims-input-x").value = 300;
      }

      if (dimsInputY < 1) {
        document.getElementById("config-menu-dims-input-y").value = 1;
      } else if (dimsInputY > 100) {
        document.getElementById("config-menu-dims-input-y").value = 300;
      }
    });

    // config reset
    document.getElementById("config-menu-reset").addEventListener("click", event => {
      ws.send("&C");
    });

    // config upload
    document.getElementById("config-menu-upload-apply").addEventListener("click", event => {
      let inputElement = document.getElementById("config-menu-upload-input");
      let file = inputElement.files[0];
      if (file) {
        file.text().then(value => {
          inputElement.value = "";
          fetch("/api/board", {
            method: "PUT",
            headers: {
              "Content-Type": "application/json"
            },
            body: value
          });
        });
      }
    });

    // config upload selected file
    document.getElementById("config-menu-upload-input").addEventListener("input", event => {
      let labelElement = document.getElementById("config-menu-upload-selected");
      let file = document.getElementById("config-menu-upload-input").files[0];
      if (file) {
        labelElement.textContent = file.name;
      } else {
        labelElement.textContent = "No file selected...";
      }
    });

    // </mapping-buttons> //
  };

  ws.onmessage = (msg) => {
    var rawData = msg.data.split(";");
    var action = rawData[0].substring(1);
    var data = rawData.slice(1, rawData.length);

    switch (action) {
      case "S": // Add piece
        board.pieces[data[0]] = new Piece(
          data[0], // id
          atob(data[1]), // base64 name
          parsePos(data[2]), // position
          atob(data[3]) // base64 icon url
        );
        break;
      case "M": // Move piece
        board.pieces[data[0]].pos = parsePos(data[1]);
        break;
      case "D": // Delete piece
        board.pieces[data[0]].remove();
        delete board.pieces[data[0]];
        break;
      case "L": // Add line
        board.lines[data[0]] = new Line(
          data[0], // id
          parsePos(data[1]), // first position
          parsePos(data[2]), // second position
          data[3] - 0, // thickness
          data[4] // color
        );
        break;
      case "R": // Delete line
        board.lines[data[0]].remove();
        delete board.lines[data[0]];
        break;
      case "B": // Resize board
        window.location.reload(); // jk, that's too hard, just refresh
        break;
    }
  };
});

fetch("/api/board/?id=" + args.id).then((response) => {
  return response.json();
}).then((json) => {
  board.dimensions = json.dimensions;
  renderBoard(json.dimensions[0], json.dimensions[1]);

  var piece;
  Object.keys(json.pieces).forEach((pieceId, i) => {
    piece = json.pieces[pieceId];
    board.pieces[pieceId] = new Piece(pieceId, piece.name, piece.pos, piece.icon);
  });

  var line;
  Object.keys(json.lines).forEach((lineId, i) => {
    line = json.lines[lineId];
    board.lines[lineId] = new Line(lineId, new Pos(line.pos1), new Pos(line.pos2), line.thickness, line.color);
  });

  jsonReady = true;
});

// RENDERING //

// this is the amount of subdivisions each tile gets
const subScale = 0.25;


// LOGIC FUNCTIONS //

// massive function to draw the tiles
function renderBoard(x, y) {
  for (var i = elementGrid.length - 1; i > -1; i--) {
    for (var j = elementGrid[i].children.length - 1; j > -1; j--) {
      elementGrid[i].children[j].remove();
      delete elementGrid[i][j];
    }
    elementGrid[i].remove();
    delete elementGrid[i];
  }

  var tempGrid = [];

  for (var i = 0; i < y; i++) {
    var row = document.createElement('div');
    row.className = 'row';
    row.id = "row-" + i;
    row.style.width = (getScale() * x) + "px";
    row.style.height = getScale() + "px";

    for (var j = 0; j < x; j++) {
      var square = document.createElement('div');
      square.className = 'square';
      square.id = "square-" + j;
      // this is some basic chess board color logic
      square.style.backgroundColor = (i + j) % 2 === 0 ? '#35393b' : '#484e51';
      square.style.width = getScale() + "px";
      square.style.height = getScale() + "px";
      square.style.left = (getScale() * j) + "px";

      var button = document.createElement("button");
      button.className = "square-button";
      button.id = "square-button-" + i + "-" + j;
      button.style.width = getScale() + "px";
      button.style.height = getScale() + "px";

      button.addEventListener("click", event => {
        var targetId = event.target.id.split("-");

        clickEvent(
          new Pos(
            (targetId[3] - 0) + subScale * Math.round(event.layerX / (getScale() * subScale)),
            (targetId[2] - 0) + subScale * Math.round(event.layerY / (getScale() * subScale))
          )
        );
      });

      square.appendChild(button);
      row.appendChild(square);
    }
    getBoardElement().appendChild(row);
    getBoardElement().style.width = (x * getScale()) + "px";
    getBoardElement().style.height = (y * getScale() + 100) + "px";
    tempGrid.push(row);
  }

  elementGrid = tempGrid;
}

// massive function to manage clicks
function clickEvent(pos) {
  // Offset by the subscale so that you can place lines on square edges
  var linePos = new Pos(pos.x + subScale, pos.y + subScale);
  var piecePos = new Pos(Math.floor(pos.x) + 1, Math.floor(pos.y) + 1);

  switch (state) {
    case States.PIECE_SELECTED:
      ws.send(
        `&M;${stateData.id};${piecePos.x},${piecePos.y}`
      );
      break;
    case States.LINE_DRAW_A:
      stateData = {
        thickness: document.getElementById("line-menu-thickness-input").value,
        color: document.getElementById("line-menu-color-input").value,
        pos: Object.freeze(linePos),
        drawLine: function(pos2) {
          ws.send(
            `&L;${stateData.pos.x},${stateData.pos.y};` +
            `${pos2.x},${pos2.y};` +
            `${stateData.thickness};${stateData.color}`
          );
        }
      }
      state = States.LINE_DRAW_B;
      break;
    case States.LINE_DRAW_B:
      stateData.drawLine(linePos);
      stateData = null;
      state = States.LINE_DRAW_A;
      break;
    case States.ADD_PIECE_B:
      var img = document.getElementById("piece-menu-preview");
      img.title = "";
      img.src = "";
      ws.send(
        `&S;${btoa(stateData.name)};` +
        `${piecePos.x},${piecePos.y};` +
        `${btoa(stateData.icon)}`
      );
      stateData = null;
      state = States.NEUTRAL;
      break;
  }
}


// HELPER FUNCTIONS //

// get the element for the board
function getBoardElement() {
  return document.getElementById("board");
}

// get the width of each tile
function getScale() {
  return localStorage.getItem("scale");
}

// parse positions from websocket data
function parsePos(rawPos) {
  var split = rawPos.split(",");
  return new Pos(split[0] - 0, split[1] - 0);
}

// convert cartesian coordinates to polar
function cartesianToPolar(x, y) {
  distance = Math.sqrt(x * x + y * y);
  radians = Math.atan2(y, x); // This takes y first
  polarCoor = {
    distance: distance,
    radians: radians
  }
  return polarCoor;
}

// convert polar coordinates to cartesian
function polarToCartesian(distance, radians) {
  return new Pos(Math.cos(radians) * distance, Math.sin(radians) * distance);
}


// HELPER CLASSES //

class Pos {
  constructor(x, y) {
    if (y === undefined) {
      y = x[1];
      x = x[0];
    }
    this[0] = x;
    this.x = x;
    this[1] = y;
    this.y = y;
  }
}


// DATA TYPE CLASSES //

class Line {
  constructor(id, pos1, pos2, thickness, color) {
    this.id = id;

    var realThickness = thickness * getScale() / 15

    var polPos = cartesianToPolar(pos2.x - pos1.x, pos2.y - pos1.y);

    this.length = polPos.distance;
    this.angle = polPos.radians;

    this.pos = pos1;

    this.element = document.createElement("button");

    this.element.addEventListener("click", event => {
      var relPos = polarToCartesian(event.layerX, this.angle);
      // Remember: the click is offset by the subscale
      var pos = new Pos(
        this.pos.x + subScale * (Math.round(relPos.x / (getScale() * subScale)) - 1),
        this.pos.y + subScale * (Math.round(relPos.y / (getScale() * subScale)) - 1)
      );

      switch (state) {
        case States.DELETE:
          stateData = this;
          ws.send(`&R;${this.id}`);
          break;
        default:
          clickEvent(pos);
      }
    });

    this.element.className = "line";
    this.element.id = "line-" + this.id;

    this.element.style.width = this.length * getScale() + "px";
    this.element.style.height = realThickness + "px";
    this.element.style.position = "absolute";

    this.element.style.backgroundColor = color;
    this.element.style.borderColor = color;
    // Crazy transform because the actual value is offset by the subscale
    this.element.style.transform = `translateY(${-(realThickness / 2 + getScale() * subScale)}px) translateX(${-getScale() * subScale}px) rotate(${this.angle}rad)`;

    this.element.style.left = this.pos.x * getScale() + "px";
    this.element.style.top = this.pos.y * getScale() + "px";

    getBoardElement().appendChild(this.element);
  }

  remove() {
    if (stateData == this) {
      stateData = null;
    }
    this.element.remove();
  }
}

class Piece {
  constructor(id, name, pos, icon) {
    this.id = id;
    this.name = name;
    this.icon = icon;

    // create the element on the page
    this.image = document.createElement("img");
    this.element = document.createElement("button");

    this.element.addEventListener('click', event => {
      var pos = new Pos(
        (this.pos.x - 1) + subScale * Math.round(event.layerX / (getScale() * subScale)),
        (this.pos.y - 1) + subScale * Math.round(event.layerY / (getScale() * subScale))
      )

      var selectedPieces = document.getElementsByClassName("selected-piece");

      switch (state) {
        case States.PIECE_SELECTED:
          if (stateData == this) {
            state = States.NEUTRAL;
            while (selectedPieces.length > 0) {
              selectedPieces[0].className = "piece";
            }
            stateData = null;
            break;
          }
          case States.NEUTRAL:
            state = States.PIECE_SELECTED;
            while (selectedPieces.length > 0) {
              selectedPieces[0].className = "piece";
            }
            stateData = this;
            this.element.className = "selected-piece";
            break;
          case States.DELETE:
            stateData = this;
            ws.send(`&D;${this.id}`);
            break;
          default:
            clickEvent(pos);
      }
    });

    this.image.className = "piece-image";
    this.image.id = "piece-image-" + id;
    this.image.style.width = getScale() + "px";
    this.image.style.height = getScale() + "px";
    this.image.src = icon;
    this.image.style.position = "absolute";
    this.element.appendChild(this.image);

    this.element.className = "piece";
    this.element.id = "piece-" + id;
    this.element.title = name;

    this.element.style.width = getScale() + "px";
    this.element.style.height = getScale() + "px";
    this.element.style.position = "absolute";

    this.pos = pos;
  }

  set pos(newPos) {
    if (stateData == this) {
      this.element.className = "piece";
      state = States.NEUTRAL;
      stateData = null;
    }
    this._pos = newPos;
    this.remove();
    this.element.style.left = (newPos.x - 1) * getScale() + "px";

    try {
      elementGrid[newPos.y - 1].appendChild(this.element);
    } catch (e) {
      console.error(e);
      ws.send(`&D;${this.id}`);
    }
  }

  get pos() {
    return this._pos;
  }

  remove() {
    if (stateData == this) {
      stateData = null;
    }
    this.element.remove();
  }
}