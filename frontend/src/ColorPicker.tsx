import { useState } from 'react'
import { RgbColorPicker } from 'react-colorful';
import axios from 'axios';
import './ColorPicker.css';

interface RGBColor {
    r: number,
    g: number,
    b: number
}

export const ColorPicker = () => {
    const [color, setColor] = useState<RGBColor>({r: 255, g: 0, b: 0});

    const handleColorChange = (color: RGBColor) => {
        setColor(color);
        //axios.post('http://192.168.1.91:6942/color', color.rgb);
    }


    return (
        <div id='wrapper'>
            <RgbColorPicker
                onChange = { handleColorChange }
                color = { color }
                className = 'colorPicker'
             />
         </div>
    )
};

