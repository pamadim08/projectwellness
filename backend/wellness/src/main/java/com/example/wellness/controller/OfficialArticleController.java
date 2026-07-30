package com.example.wellness.controller;


import com.example.wellness.model.OfficialArticle;
import com.example.wellness.service.OfficialArticleService;


import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;


import java.util.List;



@RestController
@RequestMapping("/api/articles")
@CrossOrigin(origins = "http://localhost:3000")
public class OfficialArticleController {



    @Autowired
    private OfficialArticleService service;



    @GetMapping
    public List<OfficialArticle> getAll(){

        return service.getAllArticles();
    }




    @GetMapping("/{id}")
    public OfficialArticle getById(
            @PathVariable Integer id
    ){

        return service.getArticleById(id);
    }




    @PostMapping
    public OfficialArticle create(
            @RequestBody OfficialArticle article
    ){

        return service.createArticle(article);
    }





    @PutMapping("/{id}")
    public OfficialArticle update(
            @PathVariable Integer id,
            @RequestBody OfficialArticle article
    ){

        return service.updateArticle(id, article);
    }




    @DeleteMapping("/{id}")
    public String delete(
            @PathVariable Integer id
    ){

        boolean result =
                service.deleteArticle(id);


        return result ?
                "Delete success":
                "Not found";

    }

}