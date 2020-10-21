var CUSTOM = 'CUSTOM'
var games = [['Cc-a--a--a-', 'Dbd', 'Ec-c-d'], ['Gc-g-', 'Gcd-d', 'aaaaaaaaAdp'], ['Gd--a-c--c-a--', 'hGdc-a-d-a-c', CUSTOM]]
var hints = [
  ['Hi there! Good choice for you! Click some cute empty space to put a 2 there, and then use wasd, the arrow keys, or swipe to move the tiles. Just like 2048, but try your best to get the target numbers, for instance, 16!',
    'Hi! Now try this.',
    'Here... is a more advanced one.'],
  ["Similar to the last one, isn't it?",
    'This one is... Kind of interesting.',
    'This goes much harder.'],
  ["Similar to the last one, isn't it?",
    'This one is <span style="font-weight:bold;color:red;">TERRIBLY TIME-CONSUMING</span>. Original 2048 grid, but force you to get 65536.',
    'TBD']
]

function trackEvent (type, data, retries) {
  if (retries > 6) return alert('暂时无法连接到服务器……')
  var payload = {
    type: type,
    userid: userid,
  }
  if (data !== undefined) payload.data = data
  if (retries !== undefined) payload.retries = retries
  var xhr = new XMLHttpRequest()
  xhr.open('POST', 'https://log.keeer.net/256')
  xhr.send(JSON.stringify(payload))
  xhr.onreadystatechange = function () {
    if (xhr.readyState !== 4 || xhr.status === 0) return
    if (xhr.status === 204) return
    if (xhr.status !== 200) return retry()
    alert(xhr.responseText) 
  }
  xhr.onerror = retry
  function retry (e) {
    setTimeout(function () { trackEvent(type, data, (retries || 0) + 1) }, retries ? retries * 1000 : 1000)
  }
}

var GAMEKEY = 'game_256_2020_main'
var userid = localStorage[GAMEKEY + 'id'] || ''
var idChars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789'
if (!userid) {
  for (var i = 0; i < 8; i++) {
    userid += idChars[Math.floor(Math.random() * idChars.length)]
  }
  localStorage[GAMEKEY + 'id'] = userid
  trackEvent('new-user')
}
trackEvent('load', location.href)
var TOUCH_THRESHOLD = 64
var $ = function (sel) {
  return sel.startsWith('#') ?
    document.querySelector(sel) :
    document.querySelectorAll(sel)
}
var isUpper = function (str, pos) {
  if (!pos)pos = 0
  var code = str.charCodeAt(pos)
  if (code > 90) return false
  if (code < 65) return false
  return code - 64
}
var isLower = function (str, pos) {
  if (!pos)pos = 0
  var code = str.charCodeAt(pos)
  if (code > 122) return false
  if (code < 97) return false
  return code - 96
}
var emptyWrap = $('#wrapper-in')
var outWrap = $('#wrapper-out')
var wrap = $('#wrapper')
var statusBox = $('#status')
var hint = $('#hint')
var cont = $('#cont')
var back = $('#back')
var restart = $('#refresh')
var BLACK = '#002d4d'
var WHITE = '#f5fafd'

// @function getset
// @param _get {Function} getter
// @param _set {Function} setter
function getset (_get, _set) { // add _ to avoid using keywords
  return function GetSet () {
    if (arguments.length === 0) return _get()
    else return _set.apply(null, arguments)
  }
}

// @Class Tile
// @constructor public
// @param value {Number} log2(tile value) || Tile.BLOCK
var Tile = function (value) {
  this.value = value
}
Tile.BLOCK = -1
// @method Tile.render(x,y,size)
// @param x {Number} x position
// @param y {Number} y position
// @param size {Number} the size (in px) of the tile
Tile.prototype.render = function (x, y, size) {
  // this.el is the element for this tile
  if (!this.el) {
    this.el = document.createElement('span')
    var parent = this.parent = document.createElement('div')
    parent.className = 'tile-wrapper'
    parent.appendChild(this.el)
  }
  var el = this.el
  el.className = 'tile'
  el.style.transform = 'translate(' + (x * size + 1 + 'px') + ',' + (y * size + 1 + 'px') + ')'
  el.style.fontSize = size / 2.6 + 'px'
  el.style.width = el.style.height = el.style.lineHeight = size + 'px'
  el.innerText = this.value === Tile.BLOCK ? ' ' : Math.pow(2, this.value)
  el.className = 'tile tile' + this.value
  return this.parent
}
// @method Tile.fadeout()
// @description fade out the element and remove it from DOM
Tile.prototype.fadeout = function () {
  this.el.style.opacity = 0
  var el = this.el.parentNode
  el.parentNode ? setTimeout(function () {
    el.parentNode.removeChild(el)
  }, 1000) : 0
}

// @Class Game
// @constructor private
// used by Game.fromString
var Game = function (targets, map) {
  if (!targets || !map) {
    throw new TypeError('Bad Argument')
  }
  this.targets = targets
  this.map = map
  this._start = new Date()
  this.tries = 1
}
// @function Game.fromString(str)
// @param str {String} the string representing the game
// @description load a game from a game string (deserialization)
// @example Game.fromString("Hcd-d");
Game.fromString = function (str) {
  var pos = 0

  // parse the targets
  var targetDone = false
  var targets = []
  while (!targetDone) {
    var num = isUpper(str, pos)
    if (num) targetDone = true
    else if (!(num = isLower(str, pos))) throw new TypeError('Target not an alphabet')
    targets.push(num)
    pos++
  }

  // parse size
  var size = isLower(str, pos)
  if (!size) throw new TypeError('Size not lowercase alphabet')
  pos++

  // generate empty map
  var map = []
  for (var i = 0; i < size; i++) {
    map[i] = []
    for (var j = 0; j < size; j++) map[i].push(null)
  }

  // load map
  // TODO load numbers
  var mapstr = str.substr(pos)
  var coord = [0, 0]// [x,y]
  for (pos = 0; pos < mapstr.length; pos++) {
    // TODO
    var spaces = isLower(mapstr, pos)
    if (spaces) { // lowercase is spaces
      coord[0] += spaces
    } else { // not spaces
      switch (mapstr.substr(pos, 1)) { // which command?
        case '-':
          map[coord[1]][coord[0]] = new Tile(Tile.BLOCK) // map is stored like [y][x]
          coord[0]++
          break

        default:
          throw new TypeError('Unknown command ' + mapstr.substr(pos, 1))
      }
    }
    // correct the coords
    coord[1] += parseInt(coord[0] / size) // increase y
    coord[0] = coord[0] % size // make correct x
    if (coord[1] >= size && coord[0] !== 0) { // check if overflow
      throw new TypeError('size overflow')
    }
  }
  var game = new Game(targets, map)
  game._string = str
  return game
}
// magic words 233
Game.LEFT = 'https://alan.liangcn.ml/'
Game.RIGHT = 'Author: Alan-Liang@KEEER'
Game.UP = 'Email: alan-liang@keeer.ga'
Game.DOWN = 'I LOVE RDFZ'
Game.prototype.virtual = Game.LEFT // no virtual
// @method Game._real(x,y)
// @private
// @description get the real coords when applying "virtual"(to simplify the process of moving)
Game.prototype._real = function (x, y) {
  var size = this.map.length
  switch (this.virtual) {
    case Game.UP:
      return [x, y]

    case Game.DOWN:
      return [size - x - 1, y]

    case Game.LEFT:
      return [y, x]

    case Game.RIGHT:
      return [y, size - x - 1]

    default:
      throw new Error('Virtual Direction illegal')
  }
}
Game.prototype.win = function () {
  alert('恭喜通关！用时 ' + ((Date.now() - this._start) / 1000).toFixed(1) + ' 秒。')
  this.won = true
  localStorage[GAMEKEY] = ''
  trackEvent('win', {
    string: this._string || '',
    start: this._start,
    end: new Date(),
    tries: this.tries,
  })
  if (this._string === 'Gcd-d' && !localStorage[GAMEKEY + 'passed']) {
    localStorage[GAMEKEY + 'passed'] = '1'
    alert('您可以凭此代码向工作人员领奖：' + userid)
  }
}
// @method Game.tile(x,y)
// @description rerenders and returns the tile GetSet function, concerning the virtual directions
// @param x {Number} x coord
// @param y {Number} y coord
// @return {Function} GetSet of the tile at (x,y)
Game.prototype.tile = function (x, y) {
  var map = this.map
  var real = this._real(x, y)
  var size = this.size
  return getset(
    function () {
      return map[real[0]][real[1]]
    },
    function (tile) {
      map[real[0]][real[1]] = tile
      if (tile) tile.render(real[1], real[0], size || 0)
      return tile
    }
  )
}
// @method Game.render([getListener])
// @description render the whole game.
// @param [getListener] {Function({HTMLElement})} the function that returns the listener of the given element
Game.prototype.render = function (getListener) {
  var size = this.size = 256 / this.map.length
  wrap.innerHTML = ''
  var html = ''
  for (var i = 0; i < this.map.length; i++) {
    html += '<div class="row">'
    for (var j = 0; j < this.map.length; j++) {
      html += '<span class="empty" coords="[' + j + ',' + i + ']"></span>'
      var tile = this.tile(i, j)()
      if (tile) wrap.appendChild(tile.render(i, j, size))
    }
    html += '</div>'
  }
  emptyWrap.innerHTML = html
  statusBox.innerHTML = this.toString()
  var spaces = $('.empty')
  var ctx = this
  for (var i = 0; i < spaces.length; i++) {
    // TODO: tidy this up
    ; (function (el) {
      if (!getListener) {
        el.onclick = function () {
          if (!ctx.clickable) return
          var pos = JSON.parse(el.getAttribute('coords'))
          if (ctx.tile.apply(ctx, pos)()) return
          var tile = new Tile(1)
          ctx.tile.apply(ctx, pos)(tile)
          wrap.appendChild(tile.render(pos[0], pos[1], size))
          ctx.clickable = false
          if ((!ctx.won) && ctx.reachedTarget()) {
          // won
            ctx.win()
          }
          if (!ctx.movable()) {
          // over
            alert('Game Over...')
            ctx.over = true
            localStorage[GAMEKEY] = ''
            trackEvent('over', {
              start: this._start,
              end: new Date(),
              string: this._string || '',
              won: this.won,
              tries: this.tries,
            })
          }
          statusBox.innerHTML = ctx.toString()
        }
      } else el.onclick = getListener(el)
    })(spaces[i])
  }
  window.onkeyup = function (e) {
    // console.log(e.keyCode);
    switch (e.keyCode) {
      case 87: // w
      case 38: // up
        if (ctx.move(Game.UP)) ctx.clickable = true
        break

      case 65: // a
      case 37: // left
        if (ctx.move(Game.LEFT)) ctx.clickable = true
        break

      case 83: // s
      case 40: // down
        if (ctx.move(Game.DOWN)) ctx.clickable = true
        break

      case 68: // d
      case 39: // right
        if (ctx.move(Game.RIGHT)) ctx.clickable = true
        break

      default:
    }
    if ((!ctx.won) && ctx.reachedTarget()) {
      ctx.win()
    } else {
      localStorage[GAMEKEY] = JSON.stringify(ctx)
    }
    statusBox.innerHTML = ctx.toString()
  }
  window.ontouchstart = function (e) {
    var touch = e.changedTouches[0]
    window._pageX = touch.pageX
    window._pageY = touch.pageY
  }
  window.ontouchend = function (e) {
    var touch = e.changedTouches[0]
    var dx = touch.pageX - window._pageX
    var dy = touch.pageY - window._pageY
    var absDx = Math.abs(dx)
    var absDy = Math.abs(dy)
    var direction
    if (absDx > TOUCH_THRESHOLD && absDy < TOUCH_THRESHOLD) { // horizontal
      if (dx > 0) direction = Game.RIGHT
      else direction = Game.LEFT
    }
    if (absDy > TOUCH_THRESHOLD && absDx < TOUCH_THRESHOLD) { // vertical
      if (dy > 0) direction = Game.DOWN
      else direction = Game.UP
    }
    if (direction) {
      if (ctx.move(direction)) ctx.clickable = true
    }
    if ((!ctx.won) && ctx.reachedTarget()) {
      ctx.win()
    } else {
      localStorage[GAMEKEY] = JSON.stringify(ctx)
    }
    statusBox.innerHTML = ctx.toString()
  }
  window.ontouchmove = function (e) {
    e.preventDefault()
  }
  $('#wrapper-out').ontouchstart = function (e) {
    if (!ctx.clickable) e.preventDefault()
  }
  localStorage[GAMEKEY] = JSON.stringify(ctx)
}
// @method Game.move(direction)
// @param direction {Game.UP||Game.DOWN||Game.LEFT||Game.RIGHT} the direction to move
// @return {Boolean} is this move valid
Game.prototype.move = function (direction) {
  // if it is not a round to move, than skip that
  if (this.clickable) return false
  // set the "virtual direction"
  // since here, all operations can be simplified to moving from right to left
  this.virtual = direction
  var size = this.map.length
  var moved = false
  // for every column...
  for (var i = 0; i < size; i++) {
    // the first available empty space from L to R
    var available = 0
    // lastTile is the last nonempty tile
    // lastX is the x coord of lastTile, concerning virtual
    var lastTile, lastX
    lastTile = lastX = null
    // for each tile...
    for (var j = 0; j < size; j++) {
      var tile = this.tile(j, i)()
      // if it is blank, skip it
      if (tile === null) continue
      // if it is a block, reset the lastTile and lastX values and set available to the next x coord
      if (tile.value === Tile.BLOCK) {
        available = j + 1
        lastTile = lastX = null
        continue
      }
      // if they could be combined...
      if (lastTile && (tile.value === lastTile.value)) {
        tile.value++ // this is okay because value is stored as log2(real value)
        moved = true // it could be moved.
        // fadeout last tile because it is combined
        lastTile.fadeout()
        // set the tile at last position to the new tile
        this.tile(lastX, i)(tile)
        // set the tile at this position to blank
        this.tile(j, i)(null)
        // a tile couldn't be combined twice in one move
        lastTile = null
      } else { // if the tiles are not combinable
        lastTile = tile
        // if it moved
        if (available !== j) {
          // set the original position to empty...
          this.tile(j, i)(null)
          // ...and set the tile to the new position
          this.tile(available, i)(tile)
          moved = true
        }
        lastX = available
        available++
      }
    }
  }
  // erase all virtuals
  this.virtual = Game.LEFT
  return moved
}
// @property Game.clickable indicates if the game required the player to click
Game.prototype.clickable = true
// @method Game.targetString()
// @return a human-readable string of all the targets
Game.prototype.targetString = function () {
  var targets = {}
  for (var i = 0; i < this.targets.length; i++) {
    var target = Math.pow(2, this.targets[i])
    if (!targets[target]) targets[target] = 0
    targets[target]++
  }
  var targetString = ''
  for (var i in targets) {
    if (targets[i] === 1) targetString += i
    else targetString += (targets[i] + ' 个 ' + i)
    targetString += ', '
  }
  return targetString.slice(0, -2)
}
// @method Game.mapCopy(map)
// @param map {Array} the old map
// @return {Array} a deepcopy of the old map
Game.mapCopy = function (map) {
  var newmap = []
  for (var i = 0; i < map.length; i++) {
    newmap.push([])
    for (var j = 0; j < map[i].length; j++) {
      var tile = map[i][j] ? new Tile(map[i][j].value) : null
      tile ? tile.render() : 0
      newmap[i].push(tile)
    }
  }
  return newmap
}
// @method Game.movable()
// @return {Boolean} if this game is still movable (i.e. alive)
Game.prototype.movable = function () {
  // copy the game
  var newgame = new Game(this.targets, Game.mapCopy(this.map))
  newgame.clickable = false
  // emulates all moves
  if (newgame.move(Game.UP) || newgame.move(Game.DOWN) || newgame.move(Game.LEFT) || newgame.move(Game.RIGHT)) { return true }
  return false
}
// @method Game.reachedTarget()
// @return {Boolean} if the player reached all the targets (i.e. won)
Game.prototype.reachedTarget = function () {
  var timesLeft = {}
  for (var i = 0; i < this.targets.length; i++) {
    if (!timesLeft[this.targets[i]]) timesLeft[this.targets[i]] = 0
    timesLeft[this.targets[i]]++
  }
  for (var i = 0; i < this.map.length; i++) {
    for (var j = 0; j < this.map[i].length; j++) {
      var tile = this.tile(i, j)()
      if (!tile) continue
      var value = tile.value
      if (timesLeft[value]) timesLeft[value]--
    }
  }
  for (i in timesLeft) if (timesLeft[i] > 0) return false
  return true
}
// @method Game.toString()
// @return {String} a human-readable string that indicates the current game state
Game.prototype.toString = function () {
  if (this.fake && this.fake !== 'try') return this.fake
  return (this.fake ? '3. 请试玩<br>' : '') +
         (this.clickable ? '选择 2 的位置' : '移动一步') +
         (this.fake ? '' : '<br>目标：' + this.targetString())
}
Game.prototype.restart = function () {
  for (var i = 0; i < this.map.length; i++) {
    for (var j = 0; j < this.map[i].length; j++){
      if (this.map[i][j] && this.map[i][j].value !== Tile.BLOCK) {
        this.map[i][j].fadeout()
        this.map[i][j] = null
      }
    }
  }
  this.won = this.over = false
  this.clickable = true
  statusBox.innerHTML = this.toString()
  this.tries++
  trackEvent('restart', {
    lastStart: this._start,
    tries: this.tries,
    string: this._string || '',
  })
  this._start = new Date()
}

// @function startup()
// @description initialize the start screen (i.e. select game)
var startup = function () {
  var gamemap = []
  var count = 0
  // generate the fake game map
  for (var i = 0; i < games.length; i++) {
    gamemap.push([])
    for (var j = 0; j < games.length; j++) {
      gamemap[i].push(
        (!games[i][j])
          ? null
          : (games[i][j] === CUSTOM)
            ? new Tile(NaN)
            : new Tile(count++)
      )
    }
  }
  // create a fake game
  var game = new Game([-1e100, NaN, 1e100], gamemap)
  hint.innerHTML = 'Hi there! Click something to begin your journey. Maybe... Start with 1?'
  game.fake = '选择关卡' // mark as a fake game
  cont.style.display = back.style.display = restart.style.display = 'none'
  // render with a custom listener
  game.render(function (el) {
    // parse the coords
    var pos = JSON.parse(el.getAttribute('coords'))
    // get the game string and the hint string
    var gameStr = games[pos[1]][pos[0]]
    var hintStr = hints[pos[1]][pos[0]]
    return function () {
      trackEvent('choose', pos)
      if (!gameStr) return
      back.style.display = ''
      if (gameStr === CUSTOM) {
        // 1. choose map size
        var fake = [[], []]
        for (var v = 2; v < 6; v++) fake[(v > 3) ? 1 : 0][(v - 2) % 2] = new Tile(v)
        var map = new Game([NaN], fake)
        map.fake = '1. 选择大小'
        // render the game to continue to the next step
        map.render(function (el) {
          var pos = JSON.parse(el.getAttribute('coords'))
          return function () {
            // 2. choose blocks
            var size = 2 + pos[1] * 2 + pos[0]
            var fake = []
            for (var i = 0; i < size; i++) {
              fake[i] = []
              for (var j = 0; j < size; j++) fake[i].push(null)
            }
            // generate a game of blocks
            var blockmap = new Game([NaN], fake)
            blockmap.fake = '2. 选择障碍物位置'
            var blockCount = 0
            blockmap.render(function (el) {
              var pos = JSON.parse(el.getAttribute('coords'))
              // the tile clicked
              var gs = blockmap.tile.apply(blockmap, pos)
              return function () {
                // if nonblank, it must be a block
                if (gs()) {
                  var el = gs()
                  // so remove it
                  blockCount--
                  el.fadeout()
                  gs(null)
                } else { // else a blank, set it to a block
                  var tile = new Tile(Tile.BLOCK)
                  gs(tile)
                  blockCount++
                  wrap.appendChild(tile.render())
                }
              }
            })
            cont.style.display = 'inline'
            cont.onclick = function () {
              // 3. play
              // render with default listeners
              blockmap.fake = 'try'
              blockmap.render()
              window.game = blockmap
              restart.style.display = ''
              // display id if backdoor triggered
              if (blockCount === 15) prompt('Userid:', userid) 
              cont.onclick = function () {
                // 4. set targets
                blockmap.fake = '4. 选择目标'
                blockmap.render()
                window.ontouchend = null
                restart.style.display = 'none'
                var tiles = $('.empty')
                for (var i = 0; i < tiles.length; i++) {
                  (function (el) {
                    el.onclick = function (e) {
                      var pos = JSON.parse(el.getAttribute('coords'))
                      var value
                      // if blank, ignore it
                      if (!(value = blockmap.tile.apply(blockmap, pos)())) return
                      value = value.value
                      // if block, ignore it
                      if (value === Tile.BLOCK) return
                      // toggle state
                      if (el.chosen) {
                        el.chosen = false
                        el.style.backgroundColor = ''
                        return
                      }
                      el.chosen = true
                      el.style.backgroundColor = 'rgba(255,255,0,0.2)'
                    }
                  })(tiles[i])
                }
                cont.onclick = function () {
                  // 5. generate string and play
                  var tiles = $('.empty')
                  var str = ''
                  var A = 64; var a = 96 // char codes for capital and lowercase letter a
                  var lastValue // indicates last value (to make it capital)
                  // generate targets
                  for (var i = 0; i < tiles.length; i++) {
                    var el = tiles[i]
                    if (!el.chosen) continue
                    var pos = JSON.parse(el.getAttribute('coords'))
                    var value = blockmap.tile.apply(blockmap, pos)().value
                    if (lastValue) str += String.fromCodePoint(a + lastValue)
                    lastValue = value
                  }
                  // if no tiles selected, ignore that
                  if (!lastValue) return
                  // write the last value
                  str += String.fromCodePoint(A + lastValue)
                  // write size
                  str += String.fromCodePoint(a + size)
                  // streaks of blanks
                  var streak = 0
                  for (var x = 0; x < size; x++) {
                    for (var y = 0; y < size; y++) {
                      streak++
                      var tile = blockmap.tile(y, x)()
                      // if blank, than just increase streak
                      if (!tile) continue
                      // if not a block, just increase streak
                      if (tile.value !== Tile.BLOCK) continue
                      // do not increase streak if it is a block
                      streak--
                      // if there do exists a streak, write them
                      if (streak) { str += String.fromCodePoint(a + streak) }
                      // write the block
                      str += '-'
                      // reset streak counter
                      streak = 0
                    }
                  }
                  // if there is still a streak, write it
                  if (streak) str += String.fromCodePoint(a + streak)

                  // and we're done!
                  alert('关卡链接已生成，给你的好友分享这个关卡吧！')
                  location = '?game=' + str
                }
              }
            }
          }
        })
        return
      }
      window.game = Game.fromString(gameStr)
      outWrap.style.opacity = 0
      setTimeout(function () {
        window.game.render()
        outWrap.style.opacity = 1
      }, 200)
      restart.style.display = ''
      hint.innerHTML = hintStr
    }
  })
  return game
}

// if a game is in the querystring...
var queryGame
try {
  var a = (window.location.search.substr(/game=/.exec(window.location.search).index + 5))
  var b = /&/.exec(a)
  b = b ? b.index : undefined
  a = a.substr(0, b)
  queryGame = a
} catch (e) {}
// set the title if it does is custom game
if (queryGame) document.title = 'Custom Game | 256 | KEEER'
// if there isn't a game
if (!localStorage[GAMEKEY]) {
  // no game in query, just start a new one
  if (!queryGame) var game = startup()
  // else load the game from query
  else {
    try {
      window.game = Game.fromString(queryGame)
      game.render()
    } catch (e) {
      alert('无法加载关卡：' + e)
      window.game = startup()
    }
  }
} else { // there is a game in storage
  // there does exists a game in storage and in query
  if (queryGame && confirm('检测到新的关卡，您想加载它吗？如果您已经在玩，请点击「取消」。')) {
    // confirmed, player want to load a new game
    try {
      window.game = Game.fromString(queryGame)
      game.render()
    } catch (e) {
      alert('无法加载关卡：' + e)
      window.game = startup()
    }
  } else {
    // parse the game (i.e. resume)
    var obj = JSON.parse(localStorage[GAMEKEY])
    // if it is not fake...
    if (!obj.fake) {
      // ...load it
      for (var i = 0; i < obj.map.length; i++) {
        for (var j = 0; j < obj.map[i].length; j++) {
          if (obj.map[i][j]) {
            obj.map[i][j] = new Tile(obj.map[i][j].value)
          }
        }
      }
      window.game = new Game(obj.targets, obj.map)
      if (obj.clickable !== undefined) game.clickable = obj.clickable
      game.size = obj.size
      game.won = obj.won
      game._string = obj.string
      game.start = new Date(obj.start)
      game.tries = obj.tries
      game.render()
    } else {
      window.game = startup()
    }
  }
}

var restartuping = false
function restartup () {
  if (restartuping) return
  restartuping = true
  outWrap.style.opacity = 0
  setTimeout(function () {
    restartuping = false
    startup()
    setTimeout(function () {
      outWrap.style.opacity = 1
    }, 50)
  }, 200)
}
