// scripts/seeds/language.seed.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const LANGUAGES = [
  // Active Languages (is_archived: false)
  { id: 45, name: "Assembly (NASM 2.14.02)", is_archived: false, source_file: "main.asm", compile_cmd: "nasm -f elf64 main.asm -o main.o && ld main.o -o main", run_cmd: "./main" },
  { id: 46, name: "Bash (5.0.0)", is_archived: false, source_file: "script.sh", compile_cmd: null, run_cmd: "bash script.sh" },
  { id: 47, name: "Basic (FBC 1.07.1)", is_archived: false, source_file: "main.bas", compile_cmd: "fbc main.bas -o main", run_cmd: "./main" },
  { id: 48, name: "C (GCC 7.4.0)", is_archived: false, source_file: "main.c", compile_cmd: "gcc -O2 -std=c11 -lm -o main main.c", run_cmd: "./main" },
  { id: 49, name: "C (GCC 8.3.0)", is_archived: false, source_file: "main.c", compile_cmd: "gcc -O2 -std=c11 -lm -o main main.c", run_cmd: "./main" },
  { id: 50, name: "C (GCC 9.2.0)", is_archived: false, source_file: "main.c", compile_cmd: "gcc -O2 -std=c11 -lm -o main main.c", run_cmd: "./main" },
  { id: 51, name: "C# (Mono 6.6.0.161)", is_archived: false, source_file: "Main.cs", compile_cmd: "mcs Main.cs -out:main.exe", run_cmd: "mono main.exe" },
  { id: 52, name: "C++ (GCC 7.4.0)", is_archived: false, source_file: "main.cpp", compile_cmd: "g++ -O2 -std=c++17 -o main main.cpp", run_cmd: "./main" },
  { id: 53, name: "C++ (GCC 8.3.0)", is_archived: false, source_file: "main.cpp", compile_cmd: "g++ -O2 -std=c++17 -o main main.cpp", run_cmd: "./main" },
  { id: 54, name: "C++ (GCC 9.2.0)", is_archived: false, source_file: "main.cpp", compile_cmd: "g++ -O2 -std=c++17 -o main main.cpp", run_cmd: "./main" },
  { id: 55, name: "Common Lisp (SBCL 2.0.0)", is_archived: false, source_file: "main.lisp", compile_cmd: null, run_cmd: "sbcl --script main.lisp" },
  { id: 56, name: "D (DMD 2.089.1)", is_archived: false, source_file: "main.d", compile_cmd: "dmd -of=main main.d", run_cmd: "./main" },
  { id: 57, name: "Elixir (1.9.4)", is_archived: false, source_file: "main.ex", compile_cmd: null, run_cmd: "elixir main.ex" },
  { id: 58, name: "Erlang (OTP 22.2)", is_archived: false, source_file: "main.erl", compile_cmd: "erlc main.erl", run_cmd: "erl -noshell -s main -s init stop" },
  { id: 59, name: "Fortran (GFortran 9.2.0)", is_archived: false, source_file: "main.f90", compile_cmd: "gfortran -O2 -o main main.f90", run_cmd: "./main" },
  { id: 60, name: "Go (1.13.5)", is_archived: false, source_file: "main.go", compile_cmd: "go build -o main main.go", run_cmd: "./main" },
  { id: 61, name: "Haskell (GHC 8.8.1)", is_archived: false, source_file: "main.hs", compile_cmd: "ghc -O2 -o main main.hs", run_cmd: "./main" },
  { id: 62, name: "Java (OpenJDK 13.0.1)", is_archived: false, source_file: "Main.java", compile_cmd: "javac Main.java", run_cmd: "java Main" },
  { id: 63, name: "JavaScript (Node.js 12.14.0)", is_archived: false, source_file: "main.js", compile_cmd: null, run_cmd: "node main.js" },
  { id: 64, name: "Lua (5.3.5)", is_archived: false, source_file: "main.lua", compile_cmd: null, run_cmd: "lua main.lua" },
  { id: 65, name: "OCaml (4.09.0)", is_archived: false, source_file: "main.ml", compile_cmd: "ocamlc -o main main.ml", run_cmd: "./main" },
  { id: 66, name: "Octave (5.1.0)", is_archived: false, source_file: "main.m", compile_cmd: null, run_cmd: "octave --no-gui main.m" },
  { id: 67, name: "Pascal (FPC 3.0.4)", is_archived: false, source_file: "main.pas", compile_cmd: "fpc main.pas -omain", run_cmd: "./main" },
  { id: 68, name: "PHP (7.4.1)", is_archived: false, source_file: "main.php", compile_cmd: null, run_cmd: "php main.php" },
  { id: 69, name: "Prolog (GNU Prolog 1.4.5)", is_archived: false, source_file: "main.pl", compile_cmd: null, run_cmd: "gprolog --consult-file main.pl --entry-goal \"main,halt.\"" },
  { id: 70, name: "Python (2.7.17)", is_archived: false, source_file: "main.py", compile_cmd: null, run_cmd: "python2 main.py" },
  { id: 71, name: "Python (3.8.1)", is_archived: false, source_file: "main.py", compile_cmd: null, run_cmd: "python3 main.py" },
  { id: 72, name: "Ruby (2.7.0)", is_archived: false, source_file: "main.rb", compile_cmd: null, run_cmd: "ruby main.rb" },
  { id: 73, name: "Rust (1.40.0)", is_archived: false, source_file: "main.rs", compile_cmd: "rustc -O -o main main.rs", run_cmd: "./main" },
  { id: 74, name: "TypeScript (3.7.4)", is_archived: false, source_file: "main.ts", compile_cmd: "tsc main.ts", run_cmd: "node main.js" },

  // Archived Languages (is_archived: true)
  { id: 1, name: "Bash (4.4)", is_archived: true, source_file: "script.sh", compile_cmd: null, run_cmd: "/usr/local/bash-4.4/bin/bash script.sh" },
  { id: 4, name: "C (gcc 7.2.0)", is_archived: true, source_file: "main.c", compile_cmd: "gcc -O2 -std=c11 -lm -o main main.c", run_cmd: "./main" },
  { id: 5, name: "C (gcc 6.4.0)", is_archived: true, source_file: "main.c", compile_cmd: "gcc -O2 -std=c11 -lm -o main main.c", run_cmd: "./main" },
  { id: 7, name: "C (gcc 5.4.0)", is_archived: true, source_file: "main.c", compile_cmd: "gcc -O2 -std=c11 -lm -o main main.c", run_cmd: "./main" },
  { id: 8, name: "C (gcc 4.9.4)", is_archived: true, source_file: "main.c", compile_cmd: "gcc -O2 -std=c11 -lm -o main main.c", run_cmd: "./main" },
  { id: 9, name: "C (gcc 4.8.5)", is_archived: true, source_file: "main.c", compile_cmd: "gcc -O2 -std=c11 -lm -o main main.c", run_cmd: "./main" },
  { id: 10, name: "C++ (g++ 7.2.0)", is_archived: true, source_file: "main.cpp", compile_cmd: "g++ -O2 -std=c++17 -o main main.cpp", run_cmd: "./main" },
  { id: 11, name: "C++ (g++ 6.4.0)", is_archived: true, source_file: "main.cpp", compile_cmd: "g++ -O2 -std=c++17 -o main main.cpp", run_cmd: "./main" },
  { id: 12, name: "C++ (g++ 6.3.0)", is_archived: true, source_file: "main.cpp", compile_cmd: "g++ -O2 -std=c++17 -o main main.cpp", run_cmd: "./main" },
  { id: 13, name: "C++ (g++ 5.4.0)", is_archived: true, source_file: "main.cpp", compile_cmd: "g++ -O2 -std=c++17 -o main main.cpp", run_cmd: "./main" },
  { id: 14, name: "C++ (g++ 4.9.4)", is_archived: true, source_file: "main.cpp", compile_cmd: "g++ -O2 -std=c++17 -o main main.cpp", run_cmd: "./main" },
  { id: 15, name: "C++ (g++ 4.8.5)", is_archived: true, source_file: "main.cpp", compile_cmd: "g++ -O2 -std=c++17 -o main main.cpp", run_cmd: "./main" },
  { id: 70, name: "Python (2.7.17)", is_archived: false, source_file: "main.py", compile_cmd: null, run_cmd: "python2 main.py" },
  { id: 71, name: "Python (3.8.1)", is_archived: false, source_file: "main.py", compile_cmd: null, up_cmd: "python3 main.py" },
  { id: 72, name: "Ruby (2.7.0)", is_archived: false, source_file: "main.rb", compile_cmd: null, run_cmd: "ruby main.rb" },
  { id: 73, name: "Rust (1.40.0)", is_archived: false, source_file: "main.rs", compile_cmd: "rustc -O -o main main.rs", run_cmd: "./main" },
  { id: 74, name: "TypeScript (3.7.4)", is_archived: false, source_file: "main.ts", compile_cmd: "tsc main.ts", run_cmd: "node main.js" },
  { id: 89, name: "Multi File Program", is_archived: false, source_file: "", compile_cmd: null, run_cmd: "" }, // Special language for multi-file
];

async function seedLanguages() {
  console.log('Starting language seed...');

  for (const lang of LANGUAGES) {
    try {
      // Use upsert to handle both create and update
      await prisma.language.upsert({
        where: { id: lang.id },
        update: {
          name: lang.name,
          is_archived: lang.is_archived,
          source_file: lang.source_file,
          compile_cmd: lang.compile_cmd,
          run_cmd: lang.run_cmd,
        },
        create: {
          id: lang.id,
          name: lang.name,
          is_archived: lang.is_archived,
          source_file: lang.source_file,
          compile_cmd: lang.compile_cmd,
          run_cmd: lang.run_cmd,
        },
      });
      console.log(`✅ ${lang.name} (ID: ${lang.id}) ${lang.is_archived ? '[ARCHIVED]' : '[ACTIVE]'}`);
    } catch (error) {
      console.error(`❌ Failed to seed language ${lang.name} (ID: ${lang.id})`, error);
    }
  }

  console.log('✅ Language seeding completed.');
}

// Execute seed
seedLanguages()
  .catch((e) => {
    console.error('Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
