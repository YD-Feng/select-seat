/*
 * 概念：
 * Geometry - 物体
 * Material - 材质
 * Texture - 纹理
 * */

var app = {
    wWidth: window.innerWidth,
    wHeight: window.innerHeight,
    mouse: new THREE.Vector2(),
    mouseX: 0,
    mouseY: 0,
    flag: false,
    timeout: null,

    textureLoader: null,
    JSONLoader: null,
    raycaster: null,

    curItem: null,
    selectedItem: {},
    occupiedItem: {
        '0_1': {
            row: 0,
            col: 1
        }
    },

    //应用性能状态
    stats: null,
    //js渲染器
    renderer: null,
    //相机
    camera: null,
    //场景
    scene: null,
    //光源
    lights: {},
    //物体
    thing: {},
    //初始化
    init: function () {
        var _this = this;

        _this.textureLoader = new THREE.TextureLoader();
        _this.JSONLoader = new THREE.JSONLoader();
        _this.raycaster = new THREE.Raycaster();

        _this.initRenderer();
        _this.initCamera();
        _this.initScene();
        _this.initStatus();
        _this.start();

        //鼠标移动改变相机位置
        document.addEventListener('keyup', function (e) {
            if (e.keyCode == 32) {
                _this.flag = !_this.flag;
                if (_this.flag) {
                    document.getElementById('J-canvas-wrap').classList.add('move');
                    document.getElementById('J-mode-name').innerHTML = '视角调整模式(可移动鼠标调整视角)';
                } else {
                    document.getElementById('J-canvas-wrap').classList.remove('move');
                    document.getElementById('J-mode-name').innerHTML = '视角锁定模式';
                }
            }
        }, false);

        document.addEventListener('mousemove', function (e) {
            _this.onDocumentMouseMove(e)
        }, false);

        document.getElementById('J-canvas-wrap').addEventListener('click', function (e) {

            if (_this.curItem && _this.curItem.status != 'occupied') {

                if (_this.curItem.userData.status == 'selected') {
                    delete _this.selectedItem[_this.curItem.userData.row + '_' + _this.curItem.userData.col];
                } else {
                    _this.selectedItem[_this.curItem.userData.row + '_' + _this.curItem.userData.col] = _this.curItem.userData;
                }

            }

        }, false);

        document.getElementById('J-submit').addEventListener('click', function (e) {
            var arr = [];
            for (var key in _this.selectedItem) {
                arr.push((_this.selectedItem[key].row + 1) + '排' + (_this.selectedItem[key].col + 1) + '号座');
            }

            if (arr.length == 0) {
                _this.alert('你还没选任何座位');
            } else {
                _this.alert('选座成功，已选：' + arr.join('、'));
            }
        });

        document.getElementById('J-cancel').addEventListener('click', function (e) {
            _this.alert('取消选座');
        });
    },

    initRenderer: function () {
        var _this = this,
            wrap = document.getElementById('J-canvas-wrap');

        _this.renderer = new THREE.WebGLRenderer({
            antialias: true,//是否开启反锯齿，设置为true开启反锯齿
            precision: 'highp',//着色精度，highp/mediump/lowp
            alpha: true,//是否可以设置背景色透明
            preserveDrawingBuffer: true,//是否保存绘图缓冲，若设为true，则可以提取canvas绘图的缓冲
            maxLights: 1//最大灯光数，我们的场景中最多能够添加多少个灯光
        });

        //指定画布框的高宽
        wrap.style.width = _this.wWidth + 'px';
        wrap.style.height = _this.wHeight + 'px';

        //指定渲染器的高宽（和画布框大小一致）
        _this.renderer.setSize(_this.wWidth, _this.wHeight);

        //追加 canvas 元素到 J-canvas-wrap 元素中
        wrap.appendChild(_this.renderer.domElement);

        //设置 canvas 背景色(clearColor)
        _this.renderer.setClearColor(0x000000, 1.0);

        //阴影相关设置
        _this.renderer.shadowMap.enabled = true;
        _this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    },

    initCamera: function () {
        var _this = this;
        //设置透视投影的相机，默认情况下相机的上方向为 Y 轴，右方向为 X 轴，沿着 Z 轴朝里（视野角：fov 纵横比：aspect 相机离视体积最近的距离：near 相机离视体积最远的距离：far）
        _this.camera = new THREE.PerspectiveCamera(60, _this.wWidth / _this.wHeight , 1 , 5000);
        //设置相机的位置坐标
        _this.camera.position.x = 100;
        //设置相机的位置坐标
        _this.camera.position.y = 200;
        //设置相机的位置坐标
        _this.camera.position.z = 300;
        //设置相机的上为「x」轴方向
        _this.camera.up.x = 0;
        //设置相机的上为「y」轴方向
        _this.camera.up.y = 1;
        //设置相机的上为「z」轴方向
        _this.camera.up.z = 0;
        //设置视野的中心坐标
        _this.camera.lookAt({
            x: 0,
            y: 0,
            z: 0
        });
    },

    initScene: function () {
        this.scene = new THREE.Scene();
    },

    initStatus: function () {
        var _this = this;

        _this.stats = new Stats();
        //0: fps, 1: ms
        _this.stats.setMode(1);

        //将stats的界面对应左上角
        _this.stats.domElement.style.position = 'absolute';
        _this.stats.domElement.style.left = '0px';
        _this.stats.domElement.style.top = '0px';

        document.body.appendChild(_this.stats.domElement);
        setInterval(function () {
            _this.stats.begin();
            // 你的每一帧的代码
            _this.stats.end();
        }, 1000 / 60);
    },

    start: function () {
        var _this = this;

        _this.creatLight();
        _this.createSomeThing();

        _this.render();
    },

    creatLight: function () {
        var _this = this;

        //设置光源（点光源）
        _this.lights.left = new THREE.SpotLight(0xffffff, 0.2, 0);
        //设置光源向量
        _this.lights.left.position.set(-200, -50, 200);

        //设置光源（点光源）
        _this.lights.right = new THREE.SpotLight(0xffffff, 0.2, 0);
        //设置光源向量
        _this.lights.right.position.set(200, -50, 200);

        //设置光源（点光源）
        _this.lights.main = new THREE.SpotLight(0xffffff, 0.8, 0);
        //设置光源向量
        _this.lights.main.position.set(0, 220, -50);
        //光源可以产生阴影
        _this.lights.main.castShadow = true;

        for (var name in _this.lights) {
            _this.scene.add(_this.lights[name]);
        }
    },

    createSomeThing: function () {
        var _this = this,
            geometry = new THREE.Geometry();

        geometry.vertices.push(new THREE.Vector3(-500, 0, 0));
        geometry.vertices.push(new THREE.Vector3(500, 0, 0));

        //线格
        for (var i = 0; i < 21; i ++) {

            _this.thing['line_a' + i] = new THREE.Line(geometry, new THREE.LineBasicMaterial({
                color: 0x000000,
                opacity: 0.5
            }));
            _this.thing['line_a' + i].position.z = ( i * 50 ) - 500;
            _this.scene.add(_this.thing['line_a' + i]);

            _this.thing['line_b' + i] = new THREE.Line( geometry, new THREE.LineBasicMaterial({
                color: 0x000000,
                opacity: 0.5
            }));
            _this.thing['line_b' + i].position.x = ( i * 50 ) - 500;
            _this.thing['line_b' + i].rotation.y = 90 * Math.PI / 180;
            _this.scene.add(_this.thing['line_b' + i]);
        }

        //音箱
        var wifiBg = _this.textureLoader.load('./img/wifi.png'),
            wood = _this.textureLoader.load('./img/wood.jpg'),
            wifiCount = 6,
            positionZ = [-106, 14, 126];

        for (var i = 0; i < wifiCount; i++) {
            _this.thing['wifi' + i] = new THREE.Mesh(
                new THREE.BoxGeometry(8, 14, 6), //width, height, depth
                [
                    new THREE.MeshLambertMaterial({
                        color: 0xcccccc,
                        map: wood
                    }),
                    new THREE.MeshLambertMaterial({
                        color: 0xcccccc,
                        map: wood
                    }),
                    new THREE.MeshLambertMaterial({
                        color: 0xcccccc,
                        map: wood
                    }),
                    new THREE.MeshLambertMaterial({
                        color: 0xcccccc,
                        map: wood
                    }),
                    new THREE.MeshLambertMaterial({
                        color: 0xcccccc,
                        map: wifiBg
                    }),
                    new THREE.MeshLambertMaterial({
                        color: 0xcccccc,
                        map: wood
                    })
                ] //为各个面设定不同的材质
            );

            _this.thing['wifi' + i].position.set(i % 2 == 0 ? 147 : -147, 100 + Math.floor(i / 2) * 15 , positionZ[Math.floor(i / 2)]);
            _this.thing['wifi' + i].rotation.set(0, (i % 2 == 0 ? -1 : 1) * 90 * Math.PI / 180, 0);
            _this.thing['wifi' + i].castShadow = true;
            _this.scene.add(_this.thing['wifi' + i]);
        }

        //屏幕
        var film = _this.textureLoader.load('./img/film.jpg');
        _this.thing.screen = new THREE.Mesh(
            new THREE.PlaneBufferGeometry(260, 100, 1, 1), //width, height, widthSegments, heightSegments
            new THREE.MeshLambertMaterial({
                emissive: 0xf2f2f2, //自发光
                emissiveMap: film
            })
        );
        _this.thing.screen.position.set(0, 80, -149);
        _this.thing.screen.rotation.set(0, 0, 0);
        _this.thing.screen.receiveShadow = true;
        _this.scene.add(_this.thing.screen);


        //地面
        _this.thing.floor = new THREE.Mesh(
            new THREE.PlaneBufferGeometry(300, 300, 1, 1), //width, height, widthSegments, heightSegments
            new THREE.MeshLambertMaterial({
                color: 0xffffff,
                wireframe: false
            })
        );
        _this.thing.floor.position.set(0, 1, 0);
        _this.thing.floor.rotation.set(-90 * Math.PI / 180, 0, 0);
        _this.thing.floor.receiveShadow = true;
        _this.scene.add(_this.thing.floor);

        //天花板
        _this.thing.ceiling = new THREE.Mesh(
            new THREE.PlaneBufferGeometry(300, 300, 1, 1), //width, height, widthSegments, heightSegments
            new THREE.MeshLambertMaterial({
                color: 0xffffff,
                wireframe: false
            })
        );
        _this.thing.ceiling.position.set(0, 150, 0);
        _this.thing.ceiling.rotation.set(90 * Math.PI / 180, 0, 0);
        _this.thing.ceiling.receiveShadow = true;
        _this.scene.add(_this.thing.ceiling);

        //正墙
        _this.thing.backWall = new THREE.Mesh(
            new THREE.PlaneBufferGeometry(300, 150, 1, 1), //width, height, widthSegments, heightSegments
            new THREE.MeshLambertMaterial({
                color: 0xffffff,
                wireframe: false
            })
        );
        _this.thing.backWall.position.set(0, 75, -150);
        _this.thing.backWall.rotation.set(0, 0, 0);
        _this.thing.backWall.receiveShadow = true;
        _this.scene.add(_this.thing.backWall);

        //左墙
        _this.thing.leftWall = new THREE.Mesh(
            new THREE.PlaneBufferGeometry(302, 150, 1, 1), //width, height, widthSegments, heightSegments
            new THREE.MeshLambertMaterial({
                color: 0xffffff,
                side: THREE.DoubleSide,
                wireframe: false
            })
        );
        _this.thing.leftWall.position.set(-150, 75, -1);
        _this.thing.leftWall.rotation.set(0, 90 * Math.PI / 180, 0);
        _this.thing.leftWall.receiveShadow = true;
        _this.scene.add(_this.thing.leftWall);

        //右墙
        _this.thing.rightWall = new THREE.Mesh(
            new THREE.PlaneBufferGeometry(302, 150, 1, 1), //width, height, widthSegments, heightSegments
            new THREE.MeshLambertMaterial({
                color: 0xffffff,
                side: THREE.DoubleSide,
                wireframe: false
            })
        );
        _this.thing.rightWall.position.set(150, 75, -1);
        _this.thing.rightWall.rotation.set(0, 90 * Math.PI / 180, 0);
        _this.thing.rightWall.receiveShadow = true;
        _this.scene.add(_this.thing.rightWall);

        //阶梯地面 & 座椅
        var ladderHeight = 8,
            ladderDepth = 30,
            ladderCount = 8,
            eachRowSeatCount = 12,
            shape = new THREE.Shape();

        //画出座椅的截面
        shape.moveTo(0, 0);
        shape.lineTo(3, 0);
        shape.lineTo(3, -6);
        shape.lineTo(10, -6);
        shape.lineTo(10, 0);
        shape.lineTo(12, 0);
        shape.bezierCurveTo(16, 4, 12, 4, 4, 3);
        shape.lineTo(4, 12);
        shape.bezierCurveTo(0, 16, 0, 14, 1, 7);
        shape.lineTo(0, 0);

        for (var i = 0; i < ladderCount; i++) {
            _this.thing['ladder' + i] = new THREE.Mesh(
                new THREE.BoxGeometry(300, ladderHeight * (i + 1), ladderDepth),
                new THREE.MeshLambertMaterial({
                    color: 0xffffff,
                    wireframe: false
                })
            );
            _this.thing['ladder' + i].position.set(0, ladderHeight * (i + 1 ) * 0.5, - 90 + ladderDepth * (i + 0.5));
            _this.thing['ladder' + i].receiveShadow = true;
            _this.scene.add(_this.thing['ladder' + i]);

            if (i == ladderCount - 1) continue;

            for (var j = 0; j < eachRowSeatCount; j++) {

                var positionGapX = 0;

                if (j > 2 && j < 9) {
                    //第4列到第9列
                    positionGapX = 30;
                } else if (j >= 9) {
                    //第10列到第12列
                    positionGapX = 60;
                }

                _this.thing.seats = _this.thing.seats || {};
                _this.thing.seats[i + '_' + j] = new THREE.Mesh(
                    new THREE.ExtrudeGeometry(shape, {
                        steps: 1,
                        amount: 14,
                        bevelEnabled: true,
                        bevelThickness: 2,
                        bevelSize: 1,
                        bevelSegments: 1
                    }),
                    new THREE.MeshLambertMaterial({
                        color: 0x197dc7,
                        wireframe: false
                    })
                );

                _this.thing.seats[i + '_' + j].userData = {
                    type: 'seat',
                    status: 'default',
                    row: i,
                    col: j
                };

                _this.thing.seats[i + '_' + j].position.set(3 - 150 + (j * 20) + positionGapX, 8 + ladderHeight * (i + 1 ), 13 + (- 90 + ladderDepth * (i + 0.5)));
                _this.thing.seats[i + '_' + j].rotation.set(0, 90 * Math.PI / 180, 0);
                _this.scene.add(_this.thing.seats[i + '_' + j]);
            }
        }
    },

    render: function () {
        var _this = this;

        _this.renderer.render(_this.scene, _this.camera);

        if (_this.flag) {
            _this.camera.position.x = - _this.mouseX * 0.5;
            _this.camera.position.y = Math.min(Math.max(- _this.mouseY * 2, 80), 500);
            _this.camera.lookAt(_this.scene.position);
        }

        _this.raycaster.setFromCamera(_this.mouse, _this.camera);

        var intersects = _this.raycaster.intersectObjects(_this.scene.children);

        if (intersects.length > 0) {

            if (intersects[0].object.userData && intersects[0].object.userData.type == 'seat') {

                if (_this.curItem != intersects[0].object) {
                    if (_this.curItem) {
                        _this.curItem.material.emissive && _this.curItem.material.emissive.setHex(_this.curItem.currentHex);
                    }
                    _this.curItem = intersects[0].object;
                    _this.curItem.currentHex = _this.curItem.material.emissive && _this.curItem.material.emissive.getHex() || '';
                    _this.curItem.material.emissive && _this.curItem.material.emissive.setHex(0x0000ff);
                }
                document.getElementById('J-canvas-wrap').classList.add('target');

            } else {
                _this.clearCurItem();
                document.getElementById('J-canvas-wrap').classList.remove('target');
            }

        } else {
            _this.clearCurItem();
        }

        //座位状态刷新
        for (var key in _this.thing.seats) {
            var curSeat = _this.thing.seats[key],
                row = curSeat.userData.row,
                col = curSeat.userData.col,
                color = _this.occupiedItem[row +  '_' + col] ? 0xff0000 : (_this.selectedItem[row +  '_' + col] ? 0x00ff00 : 0x197dc7),
                status = _this.occupiedItem[row +  '_' + col] ? 'occupied' : (_this.selectedItem[row +  '_' + col] ? 'selected' : 'default');

            curSeat.material.color.setHex(color);
            curSeat.userData.status = status;
        }

        requestAnimationFrame(function () {
            _this.render();
        });

        TWEEN.update();
    },

    clearCurItem: function () {
        var _this = this;

        if (_this.curItem) {
            _this.curItem.material.emissive && _this.curItem.material.emissive.setHex(_this.curItem.currentHex);
        }
        _this.curItem = null;
    },

    alert: function (str) {
        var _this = this,
            alertDom = document.getElementById('J-alert');
        alertDom.innerHTML = str;
        alertDom.classList.add('show');

        clearTimeout(_this.timeout);
        _this.timeout = setTimeout(function () {
            alertDom.classList.remove('show');
        }, 3000);
    },

    onDocumentMouseMove: function (e) {
        var _this = this;

        _this.mouseX = e.clientX - (_this.wWidth / 2);
        _this.mouseY = -1 * Math.abs(e.clientY - (_this.wHeight / 2));

        _this.mouse.x = ( e.clientX / _this.wWidth ) * 2 - 1;
        _this.mouse.y = - ( e.clientY / _this.wHeight ) * 2 + 1;
    }
};

app.init();