import Car from "./Car"
import { NeuralNetwork, Level } from "./Network"
import Road from "./Road"
import { Visualizer } from "./Visualizer"

const saveBtn = document.getElementById("saveBtn")
const destroyBtn = document.getElementById("destroyBtn")
saveBtn.addEventListener("click", save)
destroyBtn.addEventListener("click", discard)
const carCanvas = document.getElementById("carCanvas")
carCanvas.width = 400
const networkCanvas = document.getElementById("networkCanvas")
networkCanvas.width = 300
const carCtx = carCanvas.getContext("2d")
const networkCtx = networkCanvas.getContext("2d")
const road = new Road(carCanvas.width / 2, carCanvas.width * 0.9)
const N = 100
const cars = generateCars(N)
let bestCar = cars[0]
const ws = new WebSocket("ws://localhost:1337");
let coords = {};
ws.onopen = () => {
    console.log("connected");
};
ws.onmessage = (e) => {
    const data = JSON.parse(e.data);
    console.log(data.x, data.y, data.z);
    coords = {
        x: data.x,
        y: data.y,
        z: data.z,
    };
    if (bestCar.controls.type === "SERVER" && data) {
        console.log(data)
        if (data.x > -0.3 && data.x < 0.3) {
            bestCar.controls.forward = false
            bestCar.controls.reverse = false
        }
        else if (data.x > 0.3)
            bestCar.controls.reverse = true
        else if (data.x < -0.6)
            bestCar.controls.forward = true
        if (data.y > -0.3 && data.y < 0.3) {
            bestCar.controls.left = false
            bestCar.controls.right = false
        }
        else if (data.y < -0.3)
            bestCar.controls.right = true
        else if (data.y > 0.3)
            bestCar.controls.left = true
    }


};
ws.onerror = (e) => {
    console.log(e.message);
};
ws.onclose = (e) => {
    console.log(e.code, e.reason);
};
let deltaTime = 1

if (localStorage.getItem("bestBrain")) {
    for (let i = 0; i < cars.length; i++) {
        cars[i].brain = JSON.parse(
            localStorage.getItem("bestBrain")
        )
        if (i != 0) {
            NeuralNetwork.mutate(cars[i].brain, 0.4)
        }
    }
}

const traffic = []

for (let i = 0; i < 50; i++) {
    for (let j = 0; j < (Math.floor(Math.random() * 2) + 1); j++) {
        traffic.push(new Car(road.getLaneCenter(Math.floor(Math.random() * 3)), i * -200, 30, 50, "DUMMY", 1.6))
    }
}

animate()

function save() {
    localStorage.setItem("bestBrain",
        JSON.stringify(bestCar.brain))
}

function discard() {
    localStorage.removeItem("bestBrain")
}

function generateCars(N) {
    const cars = []
    for (let i = 0; i < N; i++) {
        cars.push(new Car(road.getLaneCenter(1), 100, 30, 50, "AI"))
    }
    return cars
}

function animate(time) {
    const start = performance.now()
    for (let i = 0; i < traffic.length; i++) {
        traffic[i].update(road.borders, [])
    }
    for (let i = 0; i < cars.length; i++) {
        cars[i].update(road.borders, traffic)
    }

    bestCar = cars.find(
        c => c.y == Math.min(
            ...cars.map(c => c.y)
        )
    )

    carCanvas.height = window.innerHeight
    networkCanvas.height = window.innerHeight
    carCtx.save()
    carCtx.translate(0, -bestCar.y + carCanvas.height * 0.7)
    road.draw(carCtx)
    for (let i = 0; i < traffic.length; i++) {
        traffic[i].draw(carCtx, "red")
    }
    carCtx.globalAlpha = 0.2
    for (let i = 0; i < cars.length; i++) {
        cars[i].draw(carCtx, "blue")
    }
    carCtx.globalAlpha = 1
    bestCar.draw(carCtx, "blue", true)
    carCtx.restore()

    networkCtx.lineDashOffset = -time / 50
    Visualizer.drawNetwork(networkCtx, bestCar.brain)
    requestAnimationFrame(() => {
        deltaTime = (performance.now() - start) / 1000
        animate()
    })
}