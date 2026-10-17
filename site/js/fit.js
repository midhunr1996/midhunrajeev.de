// Role fit: what a recruiter is hiring for, and the evidence on this sheet for it.
// Pure data and helpers (no DOM), so the references can be checked against content.js in tests.
// Every sentence here is drawn from the CV, the timeline or the project copy; nothing is new.

export const roles = [
  {
    id: 'embedded',
    label: 'Embedded firmware',
    stamp: 'Issued for embedded firmware',
    subject: 'Embedded firmware role',
    pitch: 'Firmware in C, C++ and Lua on STM32 and ESP32, debugged on real hardware with oscilloscopes and JTAG, with the electronics designed alongside it.',
    evidence: [
      'ITronic, Stuttgart: firmware from requirements to deployment, and automated calibration systems that cut manual effort by 80%.',
      'Protocod: ESP32, STM32, Raspberry Pi and Arduino products from schematic and PCB layout through firmware to validation.',
      'SPI, I2C, UART and CAN interfaces, Wi-Fi, Bluetooth and LoRa links, and power management for battery-operated devices.',
    ],
    projects: ['pipe-robot', 'uv-robot', 'power-monitor', 'tb3-follower'],
    timeline: ['itronic', 'protocod'],
    parts: [
      'ESP32, Arduino',
      'STM32, Raspberry Pi',
      'SPI, I2C, UART, CAN',
      'Real-time firmware, calibration',
      'Oscilloscope, logic analyser, JTAG',
      'Schematics, PCB layout',
      'C, C++',
      'Lua',
    ],
  },
  {
    id: 'robotics',
    label: 'Robotics software',
    stamp: 'Issued for robotics software',
    subject: 'Robotics software role',
    pitch: 'ROS and ROS 2 navigation, sensor fusion and behaviour trees, tested in Gazebo and then on the real robot.',
    evidence: [
      'TurtleBot3 person follower: YOLOv8 and LiDAR fused for distance, a py_trees behaviour tree at 10 Hz, and the same code in Gazebo and on the robot.',
      'Object-tracking robot: modular ROS nodes, a depth camera fused with ultrasonic range, and a tracking loop tuned from measured error.',
      'M.Eng. in Mechatronic and Cyber-Physical Systems, focused on advanced robotics, autonomous systems and functional safety.',
    ],
    projects: ['tb3-follower', 'object-tracking-robot', 'pipe-robot', 'uv-robot', 'akbar-drive'],
    timeline: ['meng', 'itronic'],
    parts: ['ROS / ROS 2', 'Sensor fusion', 'Behaviour trees, Gazebo', 'Mobile-robot control', 'YOLO detectors', 'Python', 'C, C++'],
  },
  {
    id: 'vision',
    label: 'Perception & ML',
    stamp: 'Issued for perception and ML',
    subject: 'Perception and machine learning role',
    pitch: 'YOLO detectors and U-Net segmentation, trained in PyTorch and deployed through ONNX to a headset, a browser and a Raspberry Pi.',
    evidence: [
      'Mixed-reality inspection: YOLO running on the Meta Quest 3 itself, with a PyQt5 tool I built to capture, label and curate the dataset.',
      'Tea-leaf defect detector running in the browser with onnxruntime-web, aimed at a Raspberry Pi 5 inspection station.',
      'Medical imaging: two-stage mitosis detection at 97.15% crop accuracy, plus nuclei and brain-tumour segmentation with EfficientNetV2 encoders.',
    ],
    projects: ['mr-inspection', 'tea-leaf', 'mitosis', 'nuclei-segmentation', 'brain-tumour', 'facial-expression', 'tb3-follower'],
    timeline: ['meng'],
    parts: ['YOLO detectors', 'Segmentation (U-Net)', 'PyTorch, ONNX deployment', 'OpenCV', 'Python', 'PyQt5 tools'],
  },
  {
    id: 'research',
    label: 'Research / PhD',
    stamp: 'Issued for research',
    subject: 'Research position or doctoral candidacy',
    pitch: 'Mechanism modelling, designed experiments and perception systems judged with statistics rather than by eye, aimed at applied robotics research.',
    evidence: [
      'Derived a 144 : 1 compound cycloidal drive from the cycloid equations and wrote it as a parametric CAD script; it is the drive at the top of this page.',
      'Surface-quality prediction: XGBoost, Random Forest and neural networks on an L18 design of experiments, compared by cross-validation.',
      'Comfortable across a whole robot: mechanism, electronics, firmware, ROS, perception models and the statistics to evaluate them.',
    ],
    projects: ['akbar-drive', 'roughness-ml', 'mr-inspection', 'gyroid-exchanger', 'nuclei-segmentation', 'tb3-follower'],
    timeline: ['meng'],
    parts: ['Mechanism design', 'Parametric CAD scripting', 'XGBoost, scikit-learn, DoE', 'Segmentation (U-Net)', 'SolidWorks, nTopology, Ansys', 'YOLO detectors'],
  },
];

export function roleById(id) {
  return roles.find((role) => role.id === id) ?? null;
}

/** The role's projects as objects, in the role's own order; ids that do not exist are skipped. */
export function rankProjects(role, projects) {
  const byId = new Map(projects.map((project) => [project.id, project]));
  return role.projects.map((id) => byId.get(id)).filter(Boolean);
}

export function isRelevantPart(role, partName) {
  return Boolean(role?.parts.includes(partName));
}
