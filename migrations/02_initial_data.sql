-- Insert initial menu items from existing data
INSERT INTO menu_items (name, price) VALUES
  ('Hamburguesa Clásica', 45),
  ('Hamburguesa Clásica con Papas', 55),
  ('Hamburguesa Clásica con Tocino', 50),
  ('Hamburguesa Clásica Doble Queso', 55),
  ('Hamburguesa Hawaiana Doble Queso', 75),
  ('Hamburguesa Hawaiana', 65),
  ('Hamburguesa Clásica Doble Carne', 80),
  ('Salchipulpos', 35),
  ('Salchipulpos con Papas', 45),
  ('Palomitas de Pollo', 50),
  ('Palomitas de Pollo con Papas', 60),
  ('Nuggets', 40),
  ('Nuggets con Papas', 50),
  ('Clásico', 15),
  ('Clásico con Papas', 55),
  ('Orden Clásica', 45),
  ('Clásico con Tocino', 20),
  ('Clásico con Queso', 20),
  ('Alitas con Papas', 90),
  ('Alitas Sencillas', 75),
  ('Papas a la Francesa', 35);

-- Create default tables
INSERT INTO tables (id, name) VALUES
  (1, 'Mesa 1'),
  (2, 'Mesa 2'),
  (3, 'Mesa 3'),
  (4, 'Mesa 4');
