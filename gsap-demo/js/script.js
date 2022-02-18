var t1 = new TimelineMax({
    paused: true
});

t1.to(".block", 1.2, {
    width: "25%",
    ease: Power4.easeInOut

});

t1.staggerFrom(".menu ul li", 0.8, {
    scale: 0,
    opacity: 0,
    ease: Power2.easeOut

}, 0.2);
t1.reverse();

$(document).on("click", ".menu-btn", function() {
    t1.reversed(!t1.reversed());
    $('.nav-menu').toggleClass('toggle-menu')
    $('body').toggleClass('body-fixed')


});


// Slider
$('.slider').clone().removeAttr('id').attr('id', 'slider-2').appendTo('body');

$('#slider-1').slick({
    arrows: false,
    speed: 750,
    autoplay: true,
    asNavFor: '#slider-2',
    dots: false
}).on('mousedown touchstart', function() {
    $('body').addClass('down');
}).on('mouseleave mouseup touchend', function() {
    $('body').removeClass('down');
});

$('#slider-2').slick({
    fade: true,
    arrows: false,
    speed: 300,
    asNavFor: '#slider-1',
    dots: false
});

setTimeout(function() {
    $(window).trigger('keydown');
    setTimeout(function() {
        $('#slider-1').slick('slickNext');
        setTimeout(function() {
            $(window).trigger('keyup');
        }, 500);
    }, 600);
}, 1500);

$('#slider-1 image').removeAttr('mask');

$(window).on('resize', function() {
    $('#donutmask circle').attr({
        cx: $(window).width() / 2,
        cy: $(window).height() / 2
    });
    $('#donutmask #outer').attr({
        r: $(window).height() / 2.6
    });
    $('#donutmask #inner').attr({
        r: $(window).height() / 4.5
    });
}).resize();

$(window).on('mousemove', function(e) {
    $('.cursor').css({
        top: e.pageY + 'px',
        left: e.pageX + 'px',
    })
});

// smooth scroll
gsap.registerPlugin(ScrollTrigger);
Scrollbar.use(OverscrollPlugin)
var Scrollbar = window.Scrollbar;

var options = {
    damping: 0.05,
};

let bodyScrollBar = Scrollbar.init(document.querySelector('#my-scrollbar'), {
    plugins: {
        overscroll: {
            effect: 'bounce',
            damping: .1,
            maxOverscroll: 100,
        }
    }
})


ScrollTrigger.scrollerProxy("#my-scrollbar", {
    scrollTop(value) {
        if (arguments.length) {
            bodyScrollBar.scrollTop = value;
        }
        return bodyScrollBar.scrollTop;
    },
    getBoundingClientRect() {
        return { top: 0, left: 0, width: window.innerWidth, height: window.innerHeight };
    }
});

bodyScrollBar.addListener(ScrollTrigger.update);

bodyScrollBar.track.yAxis.element.remove();


// GSAP Animation
function App() {
    const { Renderer, Camera, Geometry, Program, Mesh, Vec2, Vec3, Color, GPGPU } = ogl;

    let renderer, gl, camera;
    let time, mouse, color1, color2;
    let points, positionB, velocityB;

    init();

    function init() {
        renderer = new Renderer({ dpr: 1 });
        gl = renderer.gl;
        document.body.appendChild(gl.canvas);

        camera = new Camera(gl, { fov: 1 });
        camera.position.set(0, 0, 1);

        resize();
        window.addEventListener('resize', resize, true);

        function resize() {
            renderer.setSize(window.innerWidth, window.innerHeight);
            camera.perspective({ aspect: gl.canvas.width / gl.canvas.height });
        }

        initScene();
        initEventsListener();
        requestAnimationFrame(animate);
    }

    function initScene() {
        gl.clearColor(0, 0, 0, 0, 0);

        time = { value: 0 };
        mouse = { value: new Vec2() };

        const numParticles = 100;
        const positions = new Float32Array(numParticles * 4);
        const velocities = new Float32Array(numParticles * 4);
        const v = new Vec3(),
            v1 = new Vec3();
        for (let i = 0; i < numParticles; i++) {
            v.set(rnd(-1, 1), rnd(-1, 1), rnd(-1, 1));
            positions.set([v.x, v.y, v.z, 1], i * 4);
            velocities.set([0, 0, 0, 1], i * 4);

            // v.multiply(1.5);
            const a = Math.PI / 30,
                cs = Math.cos(a),
                sn = Math.sin(a);
            const rx = v.x * cs - v.y * sn;
            const ry = v.x * sn + v.y * cs;
            v1.set(rx, ry, v.z).sub(v).normalize().multiply(.5);
        }

        positionB = new GPGPU(gl, { data: positions });
        velocityB = new GPGPU(gl, { data: velocities });

        positionB.addPass({
            fragment: `
                precision highp float;

                uniform float uTime;
                uniform sampler2D tVelocity;
                uniform sampler2D tMap;

                varying vec2 vUv;

                void main() {
                vec4 position = texture2D(tMap, vUv);
                vec4 velocity = texture2D(tVelocity, vUv);
                position.xyz += velocity.xyz * 0.01;                
                gl_FragColor = position;
                }
            `,
            uniforms: {
                uTime: time,
                tVelocity: velocityB.uniform
            }
        });

        velocityB.addPass({
            fragment: `
                precision highp float;

                uniform float uTime;
                uniform sampler2D tPosition;
                uniform sampler2D tMap;
                uniform vec2 uMouse;

                varying vec2 vUv;

                void main() {
                vec4 position = texture2D(tPosition, vUv);
                vec4 velocity = texture2D(tMap, vUv);
                // vec3 toMouse = vec3(uMouse, 0.0) - position.xyz;
                vec3 toMouse = vec3(uMouse, sin(uTime)*0.1) - position.xyz;
                velocity.xyz += normalize(toMouse) * 0.04;
                velocity.xyz = clamp(velocity.xyz, vec3(-1.5), vec3(1.5));
                gl_FragColor = velocity;
                gl_FragColor.a = length(velocity.xyz);
                }
            `,
            uniforms: {
                uTime: time,
                uMouse: mouse,
                tPosition: positionB.uniform
            }
        });

        const geometry = new Geometry(gl, {
            coords: { size: 2, data: positionB.coords }
        });

        color1 = { value: new Color('#000') };
        color2 = { value: new Color('#fff') };

        const program = new Program(gl, {
            transparent: true,
            vertex: `
                precision highp float;

                attribute vec2 coords;

                uniform float uTime;
                uniform sampler2D tPosition;
                uniform sampler2D tVelocity;

                varying vec4 vVelocity;

                void main() {
                vec4 position = texture2D(tPosition, coords);
                vVelocity = texture2D(tVelocity, coords);
                gl_Position = vec4(position.xyz, 1.0);
                gl_PointSize = clamp(0.2, 4.0, 4.0 - vVelocity.a * 0.5);
                }
            `,
            fragment: `
                precision highp float;

                uniform vec3 uColor1;
                uniform vec3 uColor2;

                varying vec4 vRandom;
                varying vec4 vVelocity;

                void main() {
                float pct = smoothstep(0.3, 3.0, vVelocity.a);
                gl_FragColor = mix(vec4(uColor1, 0.0), vec4(uColor2, 1.0), pct);
                }
            `,
            uniforms: {
                uTime: time,
                tPosition: positionB.uniform,
                tVelocity: velocityB.uniform,
                uColor1: color1,
                uColor2: color2
            }
        });

        points = new Mesh(gl, { geometry, program, mode: gl.POLYGONS });
    }

    function animate(t) {
        requestAnimationFrame(animate);

        time.value = t * 1;
        velocityB.render();
        positionB.render();
        renderer.render({ scene: points, camera });
    }

    function initEventsListener() {
        if ('ontouchstart' in window) {
            gl.canvas.addEventListener('touchstart', updateMouse, true);
            gl.canvas.addEventListener('touchmove', updateMouse, true);
            gl.canvas.addEventListener('touchend', updateColors, true);
        } else {
            gl.canvas.addEventListener('mousemove', updateMouse, true);
            gl.canvas.addEventListener('mouseup', updateColors, true);
        }

        function updateColors() {
            color1.value.set(chroma.random().hex());
            color2.value.set(chroma.random().hex());
            // if (rnd() > 0.5) gl.clearColor(1, 1, 1, 1)
            // else gl.clearColor(0, 0, 0, 1)
        }

        function updateMouse(e) {
            if (e.changedTouches && e.changedTouches.length) {
                e.x = e.changedTouches[0].pageX;
                e.y = e.changedTouches[0].pageY;
            }
            if (e.x === undefined) {
                e.x = e.pageX;
                e.y = e.pageY;
            }
            mouse.value.set(
                (e.x / gl.renderer.width) * 2 - 1,
                (1.0 - e.y / gl.renderer.height) * 2 - 1
            );
        }
    }

    function rnd(min, max) {
        if (min === undefined) { min = 1; }
        if (max === undefined) {
            max = min;
            min = 0;
        }
        return Math.random() * (max - min) + min;
    }
}

App();