// samples/test-queue.js
const { QueueManager } = require('../core/queueManager');
const { createTask } = require('../core/taskTypes');

async function main() {
  const inputPaths = process.argv.slice(2);

  if (inputPaths.length === 0) {
    console.error('Uso:');
    console.error('  npm run test-queue -- "img1.png" "img2.png" ...');
    console.error('');
    console.error('Exemplo:');
    console.error('  npm run test-queue -- "C:\\Users\\mathe\\Downloads\\image.png"');
    process.exit(1);
  }

  const manager = new QueueManager();

  manager.on('task-added', (task) => {
    console.log(`➕ Task adicionada: ${task.id} (${task.kind})`);
  });

  manager.on('task-started', (task) => {
    console.log(`🚀 Task iniciada: ${task.id} (${task.kind})`);
  });

  manager.on('task-completed', (task) => {
    console.log(`✅ Task concluída: ${task.id}`);
    console.log('   Resultados:', task.resultPaths);
  });

  manager.on('task-failed', (task, err) => {
    console.log(`❌ Task falhou: ${task.id}`);
    console.log('   Erro:', err.message);
  });

  manager.on('idle', () => {
    console.log('🏁 Fila vazia, todas as tasks foram processadas.');
  });

  // Cria uma tarefa de imagem para CADA caminho passado
  for (const p of inputPaths) {
    const task = createTask({
      kind: 'image',
      inputPaths: [p],
      options: {
        targetFormat: 'webp',
        quality: 80,
      },
    });

    manager.addTask(task);
  }
}

main();
